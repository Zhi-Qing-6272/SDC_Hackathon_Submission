import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSignIn } from '@clerk/react';
import { Link, useLocation } from 'wouter';
import { KeyRound, MailCheck, ShieldCheck } from 'lucide-react';
import { passwordRecoveryRedirectPath } from '@/lib/workspace-routing';

// "Forgot password" for both sign-in paths of the same Nexora account. Three steps, all inside Nexora's own page:
//   1. enter the account email  ->  Clerk emails a 6-digit verification code (any mailbox works, Gmail included)
//   2. enter the code           ->  proves you control the mailbox
//   3. choose a new password    ->  the password is changed and you are signed in
// Whether an email has an account is never revealed: an unknown address gets the same "code sent" screen, and any code then fails.
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const stripBase = (p: string) => (basePath && p.startsWith(basePath) ? p.slice(basePath.length) || '/' : p);
type Step = 'email' | 'code' | 'password';
type Err = { code?: string; longMessage?: string; message?: string } | null;
const text = (e: Err, fallback: string) => (e?.longMessage || e?.message || fallback);
const COOLDOWN = 30;

export function ForgotPassword({ company }: { company: boolean }) {
  const { signIn } = useSignIn();
  const [, go] = useLocation();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [fake, setFake] = useState(false);         // unknown address: behave identically, but no code can ever be valid
  const [wait, setWait] = useState(0);
  const [note, setNote] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);
  const signInHref = company ? '/company-sign-in' : '/sign-in';
  const destination = passwordRecoveryRedirectPath(basePath, company);

  useEffect(() => { if (wait <= 0) return; const id = window.setTimeout(() => setWait(w => w - 1), 1000); return () => window.clearTimeout(id); }, [wait]);
  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  async function sendCode(e?: FormEvent) {
    e?.preventDefault(); setErr(''); setNote('');
    const addr = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) { setErr('Enter the email address of your account.'); return; }
    setBusy(true);
    try {
      const created = await signIn.create({ identifier: addr });
      if (created.error) {
        if ((created.error as Err)?.code === 'form_identifier_not_found') { setFake(true); setStep('code'); setWait(COOLDOWN); return; }
        setErr(text(created.error as Err, 'We could not start the reset. Please try again.')); return;
      }
      const sent = await signIn.resetPasswordEmailCode.sendCode();
      if (sent.error) { setErr(text(sent.error as Err, 'We could not send the code. Please try again.')); return; }
      setFake(false); setStep('code'); setWait(COOLDOWN);
    } catch { setErr('Something went wrong. Please try again.'); } finally { setBusy(false); }
  }

  async function resend() {
    if (wait > 0 || busy) return; setErr(''); setNote('');
    if (fake) { setWait(COOLDOWN); setNote('A new code has been sent if the account exists.'); return; }
    setBusy(true);
    try {
      const sent = await signIn.resetPasswordEmailCode.sendCode();
      if (sent.error) setErr(text(sent.error as Err, 'We could not send a new code. Please try again.')); else { setWait(COOLDOWN); setNote('A new code has been sent.'); }
    } catch { setErr('Something went wrong. Please try again.'); } finally { setBusy(false); }
  }

  async function verify(e: FormEvent) {
    e.preventDefault(); setErr(''); setNote('');
    if (!/^\d{6}$/.test(code.trim())) { setErr('Enter the 6-digit code from the email.'); return; }
    setBusy(true);
    try {
      if (fake) { setErr('That code is not correct or has expired.'); return; }
      const r = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (r.error) setErr(/expired|incorrect|invalid|not correct/i.test(text(r.error as Err, '')) ? 'That code is not correct or has expired.' : text(r.error as Err, 'That code is not correct or has expired.'));
      else setStep('password');
    } catch { setErr('Something went wrong. Please try again.'); } finally { setBusy(false); }
  }

  async function reset(e: FormEvent) {
    e.preventDefault(); setErr('');
    if (pw.length < 8) { setErr('Your password must contain 8 or more characters.'); return; }
    if (pw !== pw2) { setErr('The two passwords do not match.'); return; }
    setBusy(true);
    try {
      const r = await signIn.resetPasswordEmailCode.submitPassword({ password: pw });
      if (r.error) { setErr(text(r.error as Err, 'We could not change the password. Please try again.')); return; }
      const f = await signIn.finalize({ navigate: ({ decorateUrl }) => { const u = decorateUrl(destination); if (u.startsWith('http')) window.location.href = u; else go(stripBase(u)); } });
      if (f.error) setErr(text(f.error as Err, 'Your password was changed. Please sign in with it.'));
    } catch { setErr('Something went wrong. Please try again.'); } finally { setBusy(false); }
  }

  const titles: Record<Step, [string, string]> = {
    email: ['Forgot your password?', 'Enter the email address of your account. We will email you a 6-digit verification code.'],
    code: ['Check your email', `We sent a 6-digit code to ${email.trim() || 'your email'}. It works for a few minutes. Check spam if you do not see it.`],
    password: ['Choose a new password', 'Your code was accepted. Pick a new password for your account.'],
  };
  const Icon = step === 'email' ? KeyRound : step === 'code' ? MailCheck : ShieldCheck;

  return <section className="fp-card" data-testid="forgot-password" data-step={step}>
    <div className="fp-icon"><Icon size={20} /></div>
    <h2 data-testid="text-fp-title">{titles[step][0]}</h2>
    <p className="fp-sub">{titles[step][1]}</p>
    {step === 'email' && <form onSubmit={sendCode} noValidate>
      <label className="fp-label">Email address<input className="fp-input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} data-testid="input-fp-email" autoFocus /></label>
      {err && <p className="fp-err" role="alert" data-testid="text-fp-error">{err}</p>}
      <button className="fp-btn" disabled={busy || !email.trim()} data-testid="button-fp-send">{busy ? 'Sending…' : 'Send verification code'}</button>
    </form>}
    {step === 'code' && <form onSubmit={verify} noValidate>
      <label className="fp-label">Verification code<input ref={codeRef} className="fp-input fp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} data-testid="input-fp-code" /></label>
      {err && <p className="fp-err" role="alert" data-testid="text-fp-error">{err}</p>}
      {note && <p className="fp-ok" role="status" data-testid="text-fp-note">{note}</p>}
      <button className="fp-btn" disabled={busy || code.length !== 6} data-testid="button-fp-verify">{busy ? 'Checking…' : 'Verify code'}</button>
      <p className="fp-row"><button type="button" className="fp-link" onClick={resend} disabled={wait > 0 || busy} data-testid="button-fp-resend">{wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}</button>
        <button type="button" className="fp-link" onClick={() => { setStep('email'); setCode(''); setErr(''); setNote(''); }} data-testid="button-fp-change-email">Use a different email</button></p>
    </form>}
    {step === 'password' && <form onSubmit={reset} noValidate>
      <label className="fp-label">New password<input className="fp-input" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} data-testid="input-fp-password" autoFocus /></label>
      <label className="fp-label">Confirm new password<input className="fp-input" type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} data-testid="input-fp-password2" /></label>
      {err && <p className="fp-err" role="alert" data-testid="text-fp-error">{err}</p>}
      <button className="fp-btn" disabled={busy || !pw || !pw2} data-testid="button-fp-reset">{busy ? 'Saving…' : 'Change password and sign in'}</button>
    </form>}
    <p className="fp-back"><Link href={signInHref} data-testid="link-fp-back">Back to {company ? 'company ' : ''}sign in</Link></p>
  </section>;
}
