import nodemailer from "nodemailer";
import { logger } from "./logger";

// Invitation emails are sent over SMTP (for example Gmail with an app password, Brevo, Mailgun or any provider).
// When SMTP is not configured nothing is sent and the API tells the inviter to share the invitation link instead.
// Required: SMTP_HOST, SMTP_USER, SMTP_PASS. Optional: SMTP_PORT (587), SMTP_SECURE (true for port 465), MAIL_FROM.
export const mailConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export async function sendInvitationEmail(o: { to: string; teamName: string; inviterName: string; link: string; expiresDays: number }): Promise<{ sent: boolean; error?: string }> {
  if (!mailConfigured()) return { sent: false, error: "Email is not set up on this server." };
  try {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port, secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const from = process.env.MAIL_FROM || `Nexora <${process.env.SMTP_USER}>`;
    const subject = `${o.inviterName} invited you to join “${o.teamName}” on Nexora`;
    const text = [
      `Hi,`, ``,
      `${o.inviterName} invited you to join the learning team “${o.teamName}” on Nexora, to plan reskilling together.`, ``,
      `If you accept, the team owner will be able to see your name, current role, skills and chosen career direction. Nothing else. You can leave the team at any time.`, ``,
      `Review and accept the invitation: ${o.link}`, ``,
      `You must sign in (or create an account) with this email address. The invitation expires in ${o.expiresDays} days. If you were not expecting it, ignore this email and nothing will happen.`,
    ].join("\n");
    const html = `<p>Hi,</p><p><b>${esc(o.inviterName)}</b> invited you to join the learning team <b>“${esc(o.teamName)}”</b> on Nexora, to plan reskilling together.</p>
<p>If you accept, the team owner will be able to see your name, current role, skills and chosen career direction. Nothing else. You can leave the team at any time.</p>
<p><a href="${esc(o.link)}" style="background:#4F46E5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Review invitation</a></p>
<p style="color:#64748B;font-size:13px">You must sign in (or create an account) with this email address. The invitation expires in ${o.expiresDays} days. If you were not expecting it, ignore this email and nothing will happen.</p>`;
    await transport.sendMail({ from, to: o.to, subject, text, html });
    return { sent: true };
  } catch (err) {
    logger.error({ err }, "Could not send invitation email");
    return { sent: false, error: "The invitation email could not be sent." };
  }
}
