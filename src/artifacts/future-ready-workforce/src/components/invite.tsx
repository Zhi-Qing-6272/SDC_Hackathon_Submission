import { useState } from 'react';
import { Show, useClerk } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Check, Mail } from 'lucide-react';
import { api } from '@/lib/org-api';
import { useInviteByToken } from '@/lib/team-api';
import './team-manager.css';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// Landing page for the link in an invitation email. Joining happens only here (or in the Team view) when the invited
// person clicks Accept while signed in with the invited email address.
export function InvitePage({ token }: { token: string }) {
  const back = encodeURIComponent(`${basePath}/invite/${token}`);
  return <div className="inv"><div className="inv-card" data-testid="page-invite">
    <div className="inv-brand">Nexora</div>
    <Show when="signed-out">
      <h1>You have been invited to a learning team</h1>
      <p>Sign in, or create an account, with <b>the email address this invitation was sent to</b>. Then you can review the invitation and choose whether to join.</p>
      <div className="tm-actions"><Link href={`/sign-in?redirect_url=${back}`} className="primary-button" data-testid="link-invite-sign-in">Sign in</Link><Link href={`/sign-up?redirect_url=${back}`} className="outline-button" data-testid="link-invite-sign-up">Create account</Link></div>
    </Show>
    <Show when="signed-in"><Answer token={token} /></Show>
  </div></div>;
}

function Answer({ token }: { token: string }) {
  const q = useInviteByToken(token, true);
  const { signOut } = useClerk();
  const qc = useQueryClient();
  const [, go] = useLocation();
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const respond = async (action: 'accept' | 'decline') => {
    if (!q.data) return; setBusy(true); setErr('');
    try { await api('POST', `/invitations/${q.data.id}/${action}`); setDone(action === 'accept' ? 'accepted' : 'declined'); await qc.invalidateQueries({ queryKey: ['teams'] }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  };
  if (q.isLoading) return <p>Loading your invitation…</p>;
  if (q.isError || !q.data) return <><h1>Invitation not found</h1><p data-testid="text-invite-invalid">{q.error instanceof Error ? q.error.message : 'This invitation link is not valid.'}</p><Link href="/workspace" className="outline-button">Go to my workspace</Link></>;
  const inv = q.data;
  if (done === 'accepted' || inv.status === 'accepted') return <><h1><Check size={20} style={{ verticalAlign: '-3px' }} /> You are in “{inv.teamName}”</h1><p>You joined the team. The owner can see your name, current role, skills and chosen direction. You can leave from the Team view at any time.</p>
    <button className="primary-button" onClick={() => go('/workspace?view=team')} data-testid="button-open-team">Open my teams</button></>;
  if (done === 'declined') return <><h1>Invitation declined</h1><p>You did not join “{inv.teamName}”. Nothing was shared.</p><Link href="/workspace" className="outline-button">Go to my workspace</Link></>;
  if (!inv.forYou) return <><h1>This invitation is for someone else</h1>
    <p data-testid="text-invite-wrong-account">It was sent to <b>{inv.email}</b>, but you are signed in as <b>{inv.yourEmail || 'another account'}</b>. Sign out and sign in with the invited email address.</p>
    <div className="tm-actions"><button className="primary-button" onClick={() => signOut({ redirectUrl: `${basePath}/invite/${token}` })} data-testid="button-invite-sign-out">Sign out</button><Link href="/workspace" className="outline-button">Stay signed in</Link></div></>;
  if (inv.status !== 'pending') return <><h1>Invitation no longer available</h1><p data-testid="text-invite-closed">This invitation is {inv.status}. Ask {inv.inviterName} to send a new one.</p><Link href="/workspace" className="outline-button">Go to my workspace</Link></>;
  return <><h1><Mail size={20} style={{ verticalAlign: '-3px' }} /> Join “{inv.teamName}”?</h1>
    <p><b>{inv.inviterName}</b> invited you to plan reskilling together as a team.</p>
    <div className="inv-box"><b>If you accept, the team owner can see:</b><ul><li>your name and current role</li><li>your skills</li><li>the career direction you chose</li></ul><b>They can never see:</b><ul><li>your interests or experience notes</li><li>your CV, or anything else in your workspace</li></ul><p>You can leave the team at any time and you disappear from their view straight away.</p></div>
    {err && <p className="dc-err" role="alert">{err}</p>}
    <div className="tm-actions"><button className="primary-button" disabled={busy} onClick={() => respond('accept')} data-testid="button-invite-accept"><Check size={14} /> Accept and join</button><button className="outline-button" disabled={busy} onClick={() => respond('decline')} data-testid="button-invite-decline">Decline</button></div></>;
}
