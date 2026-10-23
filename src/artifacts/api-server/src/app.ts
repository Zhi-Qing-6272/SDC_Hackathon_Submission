import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express, { type Express, type ErrorRequestHandler } from "express";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware(req => ({
  publishableKey: publishableKeyFromHost(getClerkProxyHost(req) ?? "", process.env.CLERK_PUBLISHABLE_KEY),
})));
app.use((req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== getClerkProxyHost(req)) {
        res.status(403).json({ error: "Cross-origin changes are not allowed" });
        return;
      }
    } catch {
      res.status(403).json({ error: "Invalid request origin" });
      return;
    }
  }
  next();
});

app.use("/api", router);

// Single-process hosting (a plain Replit Repl or Autoscale deployment): when the web app has been built, serve it from here too,
// so one port carries both the site and /api. Does nothing if the build is absent (development uses the Vite dev server).
const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = [process.env.WEB_DIST, path.resolve(process.cwd(), "artifacts/future-ready-workforce/dist/public"), path.resolve(here, "../../future-ready-workforce/dist/public")]
  .find((d): d is string => !!d && existsSync(path.join(d, "index.html")));
if (webDir && process.env.NODE_ENV !== "development") {
  app.use(express.static(webDir, { index: false, maxAge: "1h", setHeaders: (res, file) => { if (file.endsWith(".html")) res.setHeader("Cache-Control", "no-cache"); } }));
  app.use((req, res, next) => {
    if ((req.method !== "GET" && req.method !== "HEAD") || req.path.startsWith("/api")) { next(); return; }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(webDir, "index.html"));
  });
  logger.info({ webDir }, "Serving the built web app");
}
const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  req.log.error({ err: error }, "Request failed");
  const status = error?.type === "entity.too.large" ? 413 : error instanceof SyntaxError ? 400 : 500;
  res.status(status).json({ error: status === 500 ? "Unable to save or load your data. Please try again." : "Invalid request body" });
};
app.use(errorHandler);

export default app;
