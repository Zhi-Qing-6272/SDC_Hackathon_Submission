import { clerkClient } from "@clerk/express";

// Who is this signed-in user? Email addresses come from the sign-in provider (Clerk) and only VERIFIED addresses
// count, so an invitation can only be accepted by someone who controls the invited mailbox.
export type Account = { emails: string[]; name: string };
const cache = new Map<string, { at: number; value: Account }>();
export async function accountOf(userId: string): Promise<Account> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < 60_000) return hit.value;
  const u = await clerkClient.users.getUser(userId);
  const emails = u.emailAddresses.filter(e => e.verification?.status === "verified").map(e => e.emailAddress.trim().toLowerCase());
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username || emails[0]?.split("@")[0] || "Someone";
  const value = { emails, name };
  cache.set(userId, { at: Date.now(), value });
  return value;
}
