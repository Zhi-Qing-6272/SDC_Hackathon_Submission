import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import { api, useOrgMe } from '@/lib/org-api';
import { courseFor } from '@/lib/discovery';
import { Bar } from './gamify';
import { CompanyForm, clearPending, loadPending, type CompanyPayload } from './company-form';
import './discover.css';
import './org.css';


// A recommended course keeps its link at the end of the note ("Title · Provider · https://…").
export const splitNote = (note: string) => { const m = note.match(/(https?:\/\/\S+)\s*$/); return { url: m?.[1], text: m ? note.slice(0, m.index).replace(/[·\s]+$/, '') : note }; };

function useRefresh() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ['org', 'me'] }), qc.invalidateQueries({ queryKey: ['org', 'admin'] })]);
}
export function useAction() {
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const refresh = useRefresh();
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(''); try { await fn(); await refresh(); return true; } catch (e) { setErr(e instanceof Error ? e.message : 'Something went wrong.'); return false; } finally { setBusy(false); } };
  return { err, busy, run, setErr };
}

export type Account = { name: string; email: string; onSignOut: () => void; onManage: () => void };
export function Org({ profileSaved, completedKeys, onToggle, onDiscover, account, adminLogin = false }: { profileSaved: boolean; completedKeys: string[]; onToggle: (key: string) => Promise<void>; onDiscover: () => void; account: Account; adminLogin?: boolean }) {
  const me = useOrgMe();
  if (me.isLoading) return <p className="dc-note">Loading your company workspace…</p>;
  if (me.isError) return <section className="panel"><p className="dc-err" style={{ marginTop: 0 }}>The company workspace could not be loaded. Try again later.</p></section>;
  if (!me.data?.org) return <JoinOrCreate account={account} notAdmin={adminLogin} />;
  if (me.data.role === 'admin') return <p className="dc-note">You are signed in as the company administrator. Use the administrator menu.</p>;
  return <><AdminLoginNotice show={adminLogin} account={account} companyName={me.data.org.name} /><MemberView me={me.data} profileSaved={profileSaved} completedKeys={completedKeys} onToggle={onToggle} onDiscover={onDiscover} /></>;
}

function AdminLoginNotice({ show, account, companyName }: { show: boolean; account: Account; companyName: string }) {
  if (!show) return null;
  return <div className="og-banner og-banner-warn" role="status" data-testid="notice-not-admin"><b>This account is not a company administrator.</b> You are signed in as {account.email || account.name}, a member of {companyName}. Only a company administrator can manage its settings. <button className="quiet-button" onClick={account.onSignOut}>Sign out</button></div>;
}

// ---------------------------------------------------------------------------------------------- no company yet
function JoinOrCreate({ account, notAdmin = false }: { account: Account; notAdmin?: boolean }) {
  const [code, setCode] = useState(''); const a = useAction();
  const join = (e: FormEvent) => { e.preventDefault(); a.run(() => api('POST', '/org/join', { code })); };
  return <>
    {notAdmin && <div className="og-banner og-banner-warn" role="status" data-testid="notice-no-company"><b>No company is linked to this account yet.</b> You are signed in as {account.email || account.name}. <button className="quiet-button" onClick={account.onSignOut}>Sign out</button></div>}
    <div className="page-head"><div><div className="eyebrow">Company workspace</div><h1>Plan learning together, with consent.</h1>
      <p className="page-subtitle">Companies can see skill gaps for employees who choose to share, and recommend training for their teams. Employees stay in control of what is shared.</p></div></div>
    <div className="og-banner" role="note" data-testid="notice-register-company-after-sign-out">
      To register a company, sign out and choose <b>Register a company</b> on the welcome page. After registering, use <b>Company sign in</b> to open its administration workspace.
      <button className="quiet-button" onClick={account.onSignOut} data-testid="button-sign-out-before-company-registration">Sign out</button>
    </div>
    <div className="og-two og-personal-company">
      <form className="panel" onSubmit={join}><div className="eyebrow">I am an employee</div><h2>Join your company</h2><p className="og-note" style={{ marginTop: 0 }}>Ask your administrator for the join code. Joining shares nothing: you decide separately whether your administrator can see your skills.</p>
        <div className="dc-row"><input className="dc-input" placeholder="Join code" value={code} onChange={e => setCode(e.target.value)} aria-label="Join code" data-testid="input-join-code" maxLength={20} /><button className="primary-button" disabled={a.busy || code.trim().length < 4} data-testid="button-join-org">Join company</button></div></form>
    </div>
    {a.err && <p className="dc-err">{a.err}</p>}
    <div className="callout section-gap"><ShieldCheck size={13} style={{ verticalAlign: '-2px' }} /> Administrators only ever see employees who have opted in, and only their name, current role, skills, chosen direction and learning-step counts. Never interests, experience notes or CV text.</div>
  </>;
}

// Only the explicit Register a company flow may consume a saved registration draft.
export function PendingCompanyRegistration({ account, pending }: { account: Account; pending: CompanyPayload }) {
  const a = useAction();
  const sent = useRef(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void a.run(async () => {
      await api('POST', '/org', pending);
      clearPending();
      try { sessionStorage.setItem('nexora-just-registered', '1'); } catch { /* optional banner */ }
    }).then(ok => { if (!ok) setFailed(true); });
  }, [pending]);
  if (!failed) return <p className="dc-note" data-testid="text-registering">Registering {pending.name}…</p>;
  return <RegisterCompany account={account} initial={pending} initialError={a.err || 'Your company could not be registered. Check the details and try again.'} />;
}

function RegisterCompany({ account, onCancel, initial, initialError = '' }: { account: Account; onCancel?: () => void; initial?: Partial<CompanyPayload>; initialError?: string }) {
  const a = useAction();
  const submit = (p: CompanyPayload) => a.run(async () => { await api('POST', '/org', p); clearPending(); try { sessionStorage.setItem('nexora-just-registered', '1'); } catch { /* the banner is optional */ } });
  return <>
    <div className="page-head"><div><div className="eyebrow">Company registration</div><h1>Register your company</h1>
      <p className="page-subtitle">You are signed in as <b>{account.email || account.name}</b>. This account becomes the company administrator. Its password is the one you chose when you created the account, and is managed by the sign-in provider, never stored in the company record.</p></div></div>
    <CompanyForm initial={{ contactName: account.name, contactEmail: account.email, ...initial }} busy={a.busy} error={a.err || initialError} submitLabel={a.busy ? 'Registering…' : 'Register company'} submitTestId="button-create-org" onSubmit={submit} onBack={onCancel} />
  </>;
}

// ---------------------------------------------------------------------------------------------- employee view
function MemberView({ me, profileSaved, completedKeys, onToggle, onDiscover }: { me: NonNullable<ReturnType<typeof useOrgMe>['data']>; profileSaved: boolean; completedKeys: string[]; onToggle: (key: string) => Promise<void>; onDiscover: () => void }) {
  const a = useAction(); const [busyKey, setBusyKey] = useState(''); const [pendingShare, setPendingShare] = useState<boolean | null>(null); const [needProfile, setNeedProfile] = useState(false);
  const setShare = async (v: boolean) => { setPendingShare(v); await a.run(() => api('PUT', '/org/membership', { shareWithAdmin: v })); setPendingShare(null); };
  const assignments = me.assignments ?? [];
  const done = new Set(completedKeys);
  const doneCount = assignments.filter(x => done.has(`org:${x.id}`)).length;
  const toggle = async (key: string) => { setBusyKey(key); try { await onToggle(key); } catch { /* error banner is shown by the app */ } setBusyKey(''); };
  return <>
    <div className="page-head"><div><div className="eyebrow">Company workspace</div><h1>{me.org!.name}</h1>{me.org!.registrationNumber && <p className="og-note" style={{ marginTop: 0 }}>Registration no. {me.org!.registrationNumber}</p>}<p className="page-subtitle">Your company can recommend training for your team. What your administrator sees is entirely your choice.</p></div></div>

    <section className="og-consent" data-testid="panel-consent">
      <label className="og-switch"><input type="checkbox" checked={pendingShare ?? !!me.sharing} disabled={a.busy} onChange={e => { if (e.target.checked && !profileSaved && !me.sharing) { setNeedProfile(true); return; } setNeedProfile(false); setShare(e.target.checked); }} data-testid="checkbox-share" />Share my skills with my company administrator</label>
      {needProfile && <div className="og-banner og-banner-warn" role="alert" data-testid="notice-need-profile"><b>Save your skills profile first.</b> There is nothing to share yet. Add your skills in Discover (or My profile), save, then come back and tick this box. <button className="primary-button" style={{ marginLeft: 8 }} onClick={onDiscover} data-testid="button-go-discover">Create my profile</button></div>}
      <div className="og-two" style={{ gap: 10 }}>
        <div><b style={{ fontSize: 12 }}>If you turn this on, your administrator can see:</b><ul><li>your name and current role</li><li>your skills</li><li>the direction you chose</li><li>how many learning steps you have completed, including company-assigned training</li></ul></div>
        <div><b style={{ fontSize: 12 }}>They can never see:</b><ul><li>your interests or experience notes</li><li>your CV (it is read in your browser and never uploaded)</li><li>anything else in your workspace</li></ul></div></div>
      <p className="og-note" style={{ margin: 0 }}>{me.sharing ? <span className="og-ok">Sharing is on.</span> : 'Sharing is off.'} You can change this at any time; when you turn it off you disappear from your administrator’s view straight away.</p>
    </section>

    <section className="panel section-gap"><div className="panel-head"><div><div className="eyebrow">Your team</div><h2>Which team are you in?</h2></div></div>
      <select className="og-select" value={me.teamId ?? ''} disabled={a.busy} onChange={e => a.run(() => api('PUT', '/org/membership', { teamId: e.target.value || null }))} aria-label="Your team" data-testid="select-my-team">
        <option value="">No team selected</option>{(me.teams ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      {!(me.teams ?? []).length && <p className="og-note">Your administrator has not created any teams yet.</p>}</section>

    <section className="panel section-gap" data-testid="panel-assigned"><div className="panel-head"><div><div className="eyebrow">Recommended by your company</div><h2>Training for you</h2>
      <p className="page-subtitle">Training your administrator recommends for your team or the whole company. Completing it is self-reported.</p></div></div>
      {assignments.length > 0 && <div style={{ marginBottom: 14 }}><div className="gm-meta" style={{ marginTop: 0 }}><span><b>{doneCount}</b> of {assignments.length} complete</span><span>{Math.round(100 * doneCount / assignments.length)}%</span></div><Bar pct={Math.round(100 * doneCount / assignments.length)} done={doneCount === assignments.length} label="Assigned training progress" /></div>}
      {!assignments.length ? <p className="dc-note" style={{ marginTop: 0 }}>Nothing has been recommended yet.</p> : <div className="dc-list">{assignments.map(r => { const c = courseFor(r.skill); const nt = splitNote(r.note); const key = `org:${r.id}`; const isDone = done.has(key); return <article className={`dc-card ${isDone ? 'is-done' : ''}`} key={r.id} data-testid={`assigned-${r.id}`}>
        <div className="dc-top"><div><h3>Build {r.skill}</h3><p>{c.provider} · about {r.hours} hours · {r.teamId ? 'For your team' : 'For the whole company'}{nt.text ? ` · “${nt.text}”` : ''}</p></div>
          <button className={isDone ? 'primary-button' : 'quiet-button'} disabled={busyKey === key} onClick={() => toggle(key)} data-testid={`button-assigned-${r.skill}`}>{isDone ? <><Check size={13} /> Complete</> : 'Mark complete'}</button></div>
        <a className="link" href={nt.url ?? c.url} target="_blank" rel="noreferrer">{nt.url ? 'Open recommended course' : 'Open provider'} <ExternalLink size={12} style={{ verticalAlign: '-2px' }} /></a></article>; })}</div>}</section>

    <section className="panel section-gap"><button className="quiet-button" style={{ paddingLeft: 0 }} disabled={a.busy} onClick={() => { if (window.confirm('Leave this company? Your administrator will no longer see you, and company-assigned training will be removed from your progress.')) a.run(() => api('DELETE', '/org/membership')); }} data-testid="button-leave-org"><LogOut size={14} /> Leave company</button></section>
    {a.err && <p className="dc-err">{a.err}</p>}
  </>;
}

// ---------------------------------------------------------------------------------------------- administrator
