---
name: Clerk proxy dependency
description: Why the Clerk frontend proxy uses the lower-level proxy package.
---

Keep the Clerk frontend proxy on `http-proxy` unless `http-proxy-middleware` no longer introduces a vulnerable `braces` dependency.

**Why:** During the October 22, 2026 dependency remediation, `http-proxy-middleware` pulled in `micromatch` and `braces@3.0.3`; no patched `braces` release was available, and the app only needed straightforward proxy behavior.

**How to apply:** Before reintroducing `http-proxy-middleware`, check its current transitive dependency tree and audit the resolved lockfile.
