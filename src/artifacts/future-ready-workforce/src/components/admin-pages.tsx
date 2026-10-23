import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Check, Copy, ExternalLink, KeyRound, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { api, hasSkill, rankTeams, teamGaps, type AdminMember, type AdminView, type CompanyDetails, type OrgTeam } from '@/lib/org-api';
import { DIRECTIONS, SKILLS, courseFor } from '@/lib/discovery';
import { findTraining, type Featured } from '@/lib/training-catalog';
import { useNames, useT } from '@/lib/admin-i18n';
import { Bar } from './gamify';
import { Field, INDUSTRIES, SIZES } from './company-form';
import { useAction, type Account } from './org';
import './discover.css';
import './org.css';

// The company administrator's pages. Every visible word goes through t() so the workspace works in English, Bahasa
// Malaysia and Chinese; data the administrator typed (company, team and employee names) is shown as entered.
const VOCAB = Object.keys(SKILLS);
const NOTE = 'Skills are self-reported by employees and are not a measure of ability or performance. Use this to plan training, not to make hiring, firing or pay decisions.';

function RegisteredBanner({ data, account }: { data: AdminView; account: Account }) {
  const { t } = useT();
  const [fresh, setFresh] = useState(() => { try { return sessionStorage.getItem('nexora-just-registered') === '1'; } catch { return false; } });
  const close = () => { try { sessionStorage.removeItem('nexora-just-registered'); } catch { /* ignore */ } setFresh(false); };
  return <div className={`og-banner ${fresh ? 'og-banner-ok' : ''}`} role="status" data-testid="banner-admin-company">
    {fresh ? <><b>{t('{name} is registered.', { name: data.org.name })}</b> {t('You are its administrator. To come back, choose “Company sign in” on the home page with the email {email} and the password you chose for this account. Write them down: they are the administrator login.', { email: account.email || '—' })} <button className="quiet-button" onClick={close} data-testid="button-dismiss-registered">{t('Got it')}</button></>
      : <>{t('Signed in as administrator of {name}', { name: data.org.name })}{data.company.registrationNumber ? <> · {t('Registration no.')} {data.company.registrationNumber}</> : null}{account.email ? <> · {account.email}</> : null}</>}
  </div>;
}

export type AdminTab = 'overview' | 'gaps' | 'teams' | 'training' | 'members' | 'company';
type Tab = AdminTab;
// Each administrator page has its own title and one-line intro. These replace the personal pages (Discover, Market signals…).
export const ADMIN_TABS: { id: AdminTab; label: string; title: string; sub: (d: AdminView, t: ReturnType<typeof useT>['t']) => string }[] = [
  { id: 'overview', label: 'Overview', title: 'Your company at a glance.', sub: (d, t) => t('{joined} employees joined, {sharing} sharing their skills. Only people who chose to share appear in your reports.', { joined: d.counts.joined, sharing: d.counts.sharing }) },
  { id: 'gaps', label: 'Skill gaps', title: 'Where skills fall short.', sub: (_d, t) => t('Compare the skills each team needs with what members have shared. Self-reported, for planning only.') },
  { id: 'teams', label: 'Teams', title: 'Organise people into teams.', sub: (_d, t) => t('Create teams, set the skills each one needs, and place employees in them.') },
  { id: 'training', label: 'Training', title: 'Find training for your teams.', sub: (_d, t) => t('Training you recommend appears on employees’ Company page. They mark it complete themselves.') },
  { id: 'members', label: 'Employees', title: 'Who has joined.', sub: (d, t) => t('{joined} joined. You see only name, role, skills and direction for those who share.', { joined: d.counts.joined }) },
  { id: 'company', label: 'Company details', title: 'Your registered company.', sub: (_d, t) => t('Update contact and address details, or remove the company and its data.') },
];

export function AdminPage({ data, tab, setTab, account }: { data: AdminView; tab: AdminTab; setTab: (t: AdminTab) => void; account: Account }) {
  const { t } = useT();
  const [teamId, setTeamId] = useState<string>('');
  const team = data.teams.find(x => x.id === teamId) ?? data.teams[0];
  const meta = ADMIN_TABS.find(x => x.id === tab)!;
  return <>
    <RegisteredBanner data={data} account={account} />
    <div className="page-head"><div><div className="eyebrow">{t('Administrator')} · {data.org.name}</div><h1 data-testid="text-admin-title">{t(meta.title)}</h1><p className="page-subtitle">{meta.sub(data, t)}</p></div></div>
    {tab === 'overview' && <Overview data={data} go={setTab} />}
    {tab === 'gaps' && <Gaps data={data} team={team} setTeamId={setTeamId} go={setTab} />}
    {tab === 'teams' && <Teams data={data} />}
    {tab === 'training' && <FindTraining data={data} />}
    {tab === 'members' && <Employees data={data} />}
    {tab === 'company' && <><CompanyCard data={data} /><RemoveTestData data={data} /><DeleteCompany account={account} /></>}
  </>;
}

function DeleteCompany({ account }: { account: Account }) {
  const { t } = useT(); const a = useAction();
  const run = () => { if (!window.confirm(t('Delete your company and all its data? Employees will be removed from it. This cannot be undone.'))) return; a.run(async () => { await api('DELETE', '/workspace'); account.onSignOut(); }); };
  return <section className="panel section-gap" data-testid="panel-delete-company"><div className="eyebrow">{t('Danger zone')}</div><h2>{t('Remove company and data')}</h2>
    <p className="og-note" style={{ marginTop: 0 }}>{t('Deletes your administrator workspace. If you are the last administrator, the company, its teams and its training recommendations are removed and employees leave it. This is also how to correct a wrong company name or registration number.')}</p>
    {a.err && <p className="dc-err" role="alert">{a.err}</p>}
    <button className="outline-button danger-button" disabled={a.busy} onClick={run} data-testid="button-delete-company"><Trash2 size={14} /> {t('Delete company and data')}</button></section>;
}

function Overview({ data, go }: { data: AdminView; go: (t: Tab) => void }) {
  const { t, tp } = useT(); const nm = useNames();
  const a = useAction(); const [copied, setCopied] = useState(false);
  const top = useMemo(() => {
    const m = new Map<string, { skill: string; people: number; teams: string[] }>();
    for (const tm of data.teams) { const g = teamGaps(tm, data.members); for (const r of g.rows) if (r.gap > 0) { const e = m.get(r.skill.toLowerCase()) ?? { skill: r.skill, people: 0, teams: [] }; e.people += r.gap; e.teams.push(nm.team(tm.name)); m.set(r.skill.toLowerCase(), e); } }
    return [...m.values()].sort((x, y) => y.people - x.people).slice(0, 5);
  }, [data, nm]);
  const copy = async () => { try { await navigator.clipboard.writeText(data.org.joinCode); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ } };
  return <>
    {data.counts.joined === 0 && !data.teams.length && <section className="panel"><div className="eyebrow">{t('Try it out')}</div><h2>{t('No employees yet')}</h2><LoadTestData /></section>}
    <div className="og-grid section-gap"><div className="og-stat"><b>{data.counts.joined}</b><span>{t('employees joined')}</span></div><div className="og-stat"><b>{data.counts.sharing}</b><span>{t('sharing their skills')}</span></div><div className="og-stat"><b>{data.teams.length}</b><span>{t('teams')}</span></div><div className="og-stat"><b>{data.recommendations.length}</b><span>{t('training recommended')}</span></div></div>
    <section className="panel section-gap"><div className="eyebrow">{t('Invite employees')}</div><h2>{t('Join code')}</h2><p className="og-note" style={{ marginTop: 0 }}>{t('Share this code with employees. Anyone with it can join your company (but sees nothing until they choose to share). Create a new code if it is shared too widely; the old code stops working.')}</p>
      <div className="og-code"><code data-testid="text-join-code">{data.org.joinCode}</code><button className="quiet-button" onClick={copy}><Copy size={13} /> {copied ? t('Copied') : t('Copy')}</button>
        <button className="quiet-button" disabled={a.busy} onClick={() => { if (window.confirm(t('Create a new join code? The current code will stop working.'))) a.run(() => api('POST', '/org/admin/join-code')); }}><KeyRound size={13} /> {t('New code')}</button></div>{a.err && <p className="dc-err">{a.err}</p>}</section>
    <section className="panel section-gap"><div className="eyebrow">{t('Biggest gaps right now')}</div><h2>{t('Where training would help most')}</h2>
      {!data.teams.length ? <p className="dc-note" style={{ marginTop: 0 }}>{t('Create a team and the skills it needs to see gaps.')} <button className="quiet-button" onClick={() => go('teams')}>{t('Set up teams')}</button></p>
        : !top.length ? <p className="dc-note" style={{ marginTop: 0 }}>{data.counts.sharing ? t('No gaps found against your teams’ required skills, or members have not been placed in teams yet.') : t('No employees are sharing their skills yet, so there is nothing to compare.')}</p>
        : <>{top.map(g => <div className="og-gap" key={g.skill}><div><b>{nm.skill(g.skill)}</b></div><div><small>{g.teams.join(', ')}</small></div><span className="pill">{tp(g.people, '{n} person', '{n} people')}</span></div>)}<button className="quiet-button" style={{ paddingLeft: 0, marginTop: 8 }} onClick={() => go('gaps')}>{t('Open skill gaps')}</button></>}</section>
    <div className="callout section-gap"><ShieldCheck size={13} style={{ verticalAlign: '-2px' }} /> {t(NOTE)} {t('To remove your company and all its data, use Company details.')}</div>
  </>;
}

const pctClass = (p: number) => (p >= 80 ? 'ok' : p >= 40 ? 'mid' : 'no');
// Every team compared on the same scale, from the biggest skill gap (rank 1) to the smallest, plus a team-by-skill matrix.
function TeamRanking({ data, onOpen }: { data: AdminView; onOpen: (teamId: string) => void }) {
  const { t } = useT(); const nm = useNames();
  const { ranked, unranked } = useMemo(() => rankTeams(data.teams, data.members), [data.teams, data.members]);
  const skills = useMemo(() => {
    const count = new Map<string, { skill: string; n: number }>();
    for (const tm of data.teams) for (const sk of tm.requiredSkills) { const e = count.get(sk.toLowerCase()) ?? { skill: sk, n: 0 }; e.n++; count.set(sk.toLowerCase(), e); }
    return [...count.values()].sort((x, y) => y.n - x.n || x.skill.localeCompare(y.skill)).map(x => x.skill);
  }, [data.teams]);
  return <section className="panel" data-testid="panel-team-ranking"><div className="eyebrow">{t('Team comparison')}</div><h2>{t('Teams ranked by skill gap')}</h2>
    <p className="page-subtitle">{t('Rank 1 has the biggest gap. Coverage = required skills present ÷ required skills, across the sharing employees in each team. Self-reported skills, for planning only.')}</p>
    {!ranked.length ? <p className="dc-note">{t('Nothing to compare yet: teams need required skills and sharing employees.')}</p> : <>
      <div className="og-wrap"><table className="og-rank"><thead><tr><th>{t('Rank')}</th><th>{t('Team')}</th><th>{t('People')}</th><th>{t('Coverage')}</th><th>{t('Missing')}</th><th>{t('Biggest gaps')}</th><th /></tr></thead>
        <tbody>{ranked.map(r => { const pct = Math.round(r.coverage * 100); return <tr key={r.team.id} data-testid={`rank-row-${r.team.name}`}>
          <td className="n" data-testid="text-rank">{r.rank}</td><td><b>{nm.team(r.team.name)}</b></td><td>{r.people}</td>
          <td className="cov"><div className="og-cov"><Bar pct={pct} done={pct >= 80} thin label={`${nm.team(r.team.name)} ${t('Coverage')}`} /><span>{pct}%</span></div></td>
          <td>{r.missing}</td><td className="w">{r.worst.length ? r.worst.map(w => `${nm.skill(w.skill)} (${w.total - w.have}/${w.total})`).join(t(', ')) : t('None')}</td>
          <td><button className="quiet-button" onClick={() => onOpen(r.team.id)} data-testid={`button-open-${r.team.name}`}>{t('Details')}</button></td></tr>; })}</tbody></table></div>
      {unranked.length > 0 && <p className="og-note" data-testid="text-unranked">{t('Not ranked (no sharing employees or no required skills): {names}.', { names: unranked.map(u => nm.team(u.team.name)).join(t(', ')) })}</p>}
      {skills.length > 0 && <><div className="eyebrow" style={{ marginTop: 16 }}>{t('Skills across teams')}</div>
        <p className="og-note" style={{ marginTop: 4 }}>{t('Share of each team’s sharing employees who have the skill. “–” means the team does not require it.')}</p>
        <div className="og-wrap"><table className="og-heat og-matrix" data-testid="matrix-teams"><thead><tr><th>{t('Team (rank order)')}</th>{skills.map(sk => <th key={sk}>{nm.skill(sk)}</th>)}</tr></thead>
          <tbody>{[...ranked.map(r => r.team), ...unranked.map(u => u.team)].map(tm => { const people = data.members.filter(m => m.teamId === tm.id); return <tr key={tm.id}><td>{nm.team(tm.name)}</td>{skills.map(sk => {
            if (!hasSkill(tm.requiredSkills, sk)) return <td className="c nil" key={sk}>–</td>;
            if (!people.length) return <td className="c nil" key={sk}>n/a</td>;
            const p = Math.round(100 * people.filter(m => hasSkill(m.skills, sk)).length / people.length); return <td className={`c ${pctClass(p)}`} key={sk}>{p}%</td>; })}</tr>; })}</tbody></table></div></>}
    </>}
  </section>;
}

// Made-up employees and teams for trying Nexora out, and removable.
function LoadTestData() {
  const { t } = useT(); const a = useAction();
  return <div className="og-test" data-testid="box-test-data"><p className="og-note" style={{ margin: '0 0 8px' }}>{t('Want to try this without real employees? Load 30 synthetic employees in 10 synthetic teams. They are invented and can be removed at any time under Company details.')}</p>
    <button className="outline-button" disabled={a.busy} onClick={() => a.run(() => api('POST', '/org/admin/sample-data'))} data-testid="button-load-test-data">{a.busy ? t('Loading…') : t('Load test data')}</button>
    {a.err && <p className="dc-err" role="alert">{a.err}</p>}</div>;
}
function RemoveTestData({ data }: { data: AdminView }) {
  const { t, tp } = useT(); const a = useAction(); const n = data.members.filter(m => m.synthetic).length; const k = data.teams.filter(x => x.synthetic).length;
  return <section className="panel section-gap" data-testid="panel-test-data"><div className="eyebrow">{t('Test data')}</div><h2>{t('Synthetic employees and teams')}</h2>
    {n || k ? <><p className="og-note" style={{ marginTop: 0 }}>{t('{employees} and {teams} are loaded. They are invented and only exist to try Nexora. Real employees and teams are not touched.', { employees: tp(n, '{n} synthetic employee', '{n} synthetic employees'), teams: tp(k, '{n} synthetic team', '{n} synthetic teams') })}</p>
      <button className="outline-button danger-button" disabled={a.busy} onClick={() => { if (window.confirm(t('Remove all synthetic employees and teams (and training recommended to those teams)?'))) a.run(() => api('DELETE', '/org/admin/sample-data')); }} data-testid="button-remove-test-data"><Trash2 size={14} /> {t('Remove test data')}</button></>
      : <LoadTestData />}
    {a.err && <p className="dc-err" role="alert">{a.err}</p>}</section>;
}

function Gaps({ data, team, setTeamId, go }: { data: AdminView; team?: OrgTeam; setTeamId: (id: string) => void; go: (t: Tab) => void }) {
  const { t, tp } = useT(); const nm = useNames();
  const a = useAction(); const [note, setNote] = useState('');
  const detailRef = useRef<HTMLElement>(null);
  if (!team) return <section className="panel"><p className="dc-note" style={{ marginTop: 0 }}>{t('Create a team and the skills it needs first.')} <button className="quiet-button" onClick={() => go('teams')}>{t('Set up teams')}</button></p><LoadTestData /></section>;
  const g = teamGaps(team, data.members);
  const recommended = (skill: string) => data.recommendations.some(r => r.teamId === team.id && r.skill.toLowerCase() === skill.toLowerCase());
  const recommend = (skill: string) => a.run(async () => { await api('POST', '/org/admin/recommendations', { teamId: team.id, skill, note, hours: courseFor(skill).hours }); });
  const unassigned = data.members.filter(m => !m.teamId).length;
  return <>
    <TeamRanking data={data} onOpen={id => { setTeamId(id); setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }} />
    <section className="panel section-gap" ref={detailRef}><div className="panel-head"><div><div className="eyebrow">{t('Team detail')}</div><h2>{nm.team(team.name)}</h2><p className="page-subtitle">{t('Required skills compared with the skills employees list.')} {tp(g.people.length, '{n} sharing employee in this team.', '{n} sharing employees in this team.')}</p></div>
      <select className="og-select" value={team.id} onChange={e => setTeamId(e.target.value)} aria-label={t('Team')} data-testid="select-gap-team">{data.teams.map(x => <option key={x.id} value={x.id}>{nm.team(x.name)}</option>)}</select></div>
      {!team.requiredSkills.length ? <p className="dc-note">{t('This team has no required skills yet.')} <button className="quiet-button" onClick={() => go('teams')}>{t('Edit team')}</button></p>
        : !g.people.length ? <p className="dc-note">{t('No sharing employees are in this team yet. Employees choose their team and whether to share; you can also place sharing employees in a team under Employees.')}{unassigned ? ` ${tp(unassigned, '{n} sharing employee is not in a team.', '{n} sharing employees are not in a team.')}` : ''}</p> : <>
        <div className="og-wrap"><table className="og-heat" data-testid="heatmap"><thead><tr><th>{t('Employee')}</th>{team.requiredSkills.map(s => <th key={s}>{nm.skill(s)}</th>)}</tr></thead>
          <tbody>{g.people.map(m => <tr key={m.id}><td>{m.name}</td>{team.requiredSkills.map(s => hasSkill(m.skills, s) ? <td className="c ok" key={s}>{t('Has')}</td> : <td className="c no" key={s}>{t('Gap')}</td>)}</tr>)}</tbody></table></div>
        <div className="dc-row"><input className="dc-input" style={{ minWidth: 260 }} placeholder={t('Optional note to employees (for the next recommendation)')} value={note} maxLength={300} onChange={e => setNote(e.target.value)} aria-label={t('Note')} /></div>
        <div style={{ marginTop: 10 }}>{g.rows.map(r => { const c = courseFor(r.skill); return <div className="og-gap" key={r.skill} data-testid={`gap-${r.skill}`}>
          <div><b>{nm.skill(r.skill)}</b><small>{t('{have} of {total} have it', { have: r.have, total: r.total })}</small></div>
          <div><Bar pct={r.total ? Math.round(100 * r.have / r.total) : 0} done={r.gap === 0} thin label={`${nm.skill(r.skill)} ${t('Coverage')}`} /><small>{r.gap === 0 ? t('No gap') : t('{who} · suggested: {provider}, about {h} h', { who: tp(r.gap, '{n} person needs this', '{n} people need this'), provider: c.provider, h: c.hours })}</small></div>
          {r.gap === 0 ? <span className="og-ok">{t('Covered')}</span> : recommended(r.skill) ? <span className="og-ok"><Check size={12} /> {t('Recommended')}</span> : <button className="quiet-button" disabled={a.busy} onClick={() => recommend(r.skill)} data-testid={`button-recommend-${r.skill}`}>{t('Recommend training')}</button>}</div>; })}</div></>}
      {a.err && <p className="dc-err">{a.err}</p>}
    </section>
    <div className="callout section-gap">{t(NOTE)}</div>
  </>;
}

function Teams({ data }: { data: AdminView }) {
  const { t, tp } = useT(); const nm = useNames();
  const a = useAction(); const [editing, setEditing] = useState<string | 'new' | null>(data.teams.length ? null : 'new');
  const [name, setName] = useState(''); const [skills, setSkills] = useState<string[]>([]); const [other, setOther] = useState('');
  const start = (tm?: OrgTeam) => { setEditing(tm?.id ?? 'new'); setName(tm?.name ?? ''); setSkills(tm ? [...tm.requiredSkills] : []); setOther(''); };
  const toggle = (s: string) => setSkills(x => hasSkill(x, s) ? x.filter(y => y.toLowerCase() !== s.toLowerCase()) : [...x, s]);
  const addOther = () => { const v = other.trim(); if (v && !hasSkill(skills, v)) setSkills([...skills, v]); setOther(''); };
  const save = async (e: FormEvent) => { e.preventDefault(); const body = { name: name.trim(), requiredSkills: other.trim() && !hasSkill(skills, other.trim()) ? [...skills, other.trim()] : skills };
    const ok = await a.run(() => editing === 'new' ? api('POST', '/org/admin/teams', body) : api('PUT', `/org/admin/teams/${editing}`, body)); if (ok) setEditing(null); };
  return <>
    <section className="panel"><div className="panel-head"><div><div className="eyebrow">{t('Teams')}</div><h2>{t('Teams and the skills they need')}</h2><p className="page-subtitle">{t('Skill gaps are measured against the required skills you set for each team.')}</p></div><button className="primary-button" onClick={() => start()} data-testid="button-new-team"><Plus size={14} /> {t('New team')}</button></div>
      {editing && <form onSubmit={save} className="section-gap" data-testid="team-form">
        <div className="dc-row" style={{ marginTop: 0 }}><input className="dc-input" placeholder={t('Team name')} value={name} maxLength={100} onChange={e => setName(e.target.value)} aria-label={t('Team name')} data-testid="input-team-name-admin" />
          <select className="og-select" value="" onChange={e => { const d = DIRECTIONS.find(x => x.id === e.target.value); if (d) setSkills(x => [...new Map([...x, ...d.skills].map(s => [s.toLowerCase(), s])).values()]); }} aria-label={t('Start from a role…')}><option value="">{t('Start from a role…')}</option>{DIRECTIONS.map(d => <option key={d.id} value={d.id}>{nm.role(d.title)}</option>)}</select></div>
        <div className="eyebrow" style={{ marginTop: 12 }}>{t('Required skills')} ({skills.length})</div>
        <div className="og-skillpick">{[...new Set([...VOCAB, ...skills])].map(s => <button type="button" key={s} className={`skill-chip ${hasSkill(skills, s) ? 'on' : ''}`} onClick={() => toggle(s)}>{nm.skill(s)}</button>)}</div>
        <div className="dc-row" style={{ marginTop: 0 }}><input className="dc-input" placeholder={t('Other skill')} value={other} maxLength={60} onChange={e => setOther(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOther(); } }} aria-label={t('Other skill')} /><button type="button" className="quiet-button" onClick={addOther}>{t('Add')}</button></div>
        <div className="dc-row"><button className="primary-button" disabled={a.busy || !name.trim()} data-testid="button-save-team-admin">{t('Save team')}</button><button type="button" className="quiet-button" onClick={() => setEditing(null)}>{t('Cancel')}</button></div></form>}
      {a.err && <p className="dc-err">{a.err}</p>}
      {!data.teams.length && !editing && <p className="dc-note">{t('No teams yet.')}</p>}
      {!data.teams.length && <LoadTestData />}
      <div className="dc-list" style={{ marginTop: 14 }}>{data.teams.map(tm => <article className="dc-card" key={tm.id} data-testid={`team-${tm.name}`}><div className="dc-top"><div><h3>{nm.team(tm.name)}</h3><p>{tp(data.members.filter(m => m.teamId === tm.id).length, '{n} sharing employee', '{n} sharing employees')}</p></div>
        <div style={{ display: 'flex', gap: 6 }}><button className="quiet-button" onClick={() => start(tm)}>{t('Edit')}</button><button className="quiet-button" aria-label={t('Delete {name}', { name: tm.name })} onClick={() => { if (window.confirm(t('Delete the team “{name}”? Employees stay in the company; recommendations for this team become company-wide.', { name: nm.team(tm.name) }))) a.run(() => api('DELETE', `/org/admin/teams/${tm.id}`)); }}><Trash2 size={13} /></button></div></div>
        <div className="skill-chips">{tm.requiredSkills.length ? tm.requiredSkills.map(s => <span className="skill-chip" key={s}>{nm.skill(s)}</span>) : <span className="dc-note">{t('No required skills yet.')}</span>}</div></article>)}</div></section>
  </>;
}

// Pick a team, a role and skills; get hand-picked courses plus live search links on the major course sites.
function FindTraining({ data }: { data: AdminView }) {
  const { t, tp } = useT(); const nm = useNames();
  const a = useAction();
  const [teamId, setTeamId] = useState(''); const [roleId, setRoleId] = useState(''); const [skills, setSkills] = useState<string[]>([]); const [extra, setExtra] = useState('');
  const team = data.teams.find(x => x.id === teamId);
  const gapSkills = useMemo(() => (team ? teamGaps(team, data.members).rows.filter(r => r.gap > 0).map(r => r.skill) : []), [team, data.members]);
  const pickTeam = (id: string) => {
    setTeamId(id); const tm = data.teams.find(x => x.id === id);
    if (!tm) return;
    const g = teamGaps(tm, data.members); setSkills(g.rows.filter(r => r.gap > 0).map(r => r.skill));
    // The role most of the team says they are heading towards.
    const counts = new Map<string, number>(); for (const m of g.people) if (m.goalRoleId) counts.set(m.goalRoleId, (counts.get(m.goalRoleId) ?? 0) + 1);
    setRoleId([...counts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? '');
  };
  const toggle = (sk: string) => setSkills(x => hasSkill(x, sk) ? x.filter(y => y.toLowerCase() !== sk.toLowerCase()) : [...x, sk]);
  const pool = [...new Set([...VOCAB, ...(team?.requiredSkills ?? [])])];
  const findings = useMemo(() => findTraining({ skills, roleId: roleId || undefined, extra }), [skills, roleId, extra]);
  const recommended = (skill: string) => data.recommendations.some(r => (r.teamId ?? '') === teamId && r.skill.toLowerCase() === skill.toLowerCase());
  const recommend = (skill: string, f?: Featured) => a.run(() => api('POST', '/org/admin/recommendations', { teamId: teamId || null, skill, hours: f?.hours ? Math.min(f.hours, 200) : courseFor(skill).hours, note: f ? `${f.title.slice(0, 120)} · ${f.provider} · ${f.url}` : '' }));
  const audience = team ? nm.team(team.name) : t('the whole company');
  const cost = (c: Featured['cost']) => t(c);
  return <section className="panel" data-testid="panel-find-training"><div className="eyebrow">{t('Find online training')}</div><h2>{t('Courses for the skills and roles you choose')}</h2>
    <p className="page-subtitle">{t('Choose a team to start from its skill gaps, or pick any role and skills. You get hand-picked starting points plus search links that open each provider’s own results.')}</p>
    <div className="og-form" style={{ marginTop: 10 }}>
      <Field label={t('Team (optional)')}><select className="og-select" value={teamId} onChange={e => pickTeam(e.target.value)} data-testid="select-training-team"><option value="">{t('Whole company')}</option>{data.teams.map(x => <option key={x.id} value={x.id}>{nm.team(x.name)}</option>)}</select></Field>
      <Field label={t('Role (optional)')}><select className="og-select" value={roleId} onChange={e => setRoleId(e.target.value)} data-testid="select-training-role"><option value="">{t('No specific role')}</option>{DIRECTIONS.map(d => <option key={d.id} value={d.id}>{nm.role(d.title)}</option>)}</select></Field>
    </div>
    <div className="eyebrow" style={{ marginTop: 12 }}>{t('Skills')} ({t('{n} selected', { n: skills.length })}){team ? ` · ${tp(gapSkills.length, '{n} gap in {team}', '{n} gaps in {team}').replace('{team}', nm.team(team.name))}` : ''}</div>
    <div className="og-skillpick">{pool.map(sk => <button type="button" key={sk} className={`skill-chip ${hasSkill(skills, sk) ? 'on' : ''}`} onClick={() => toggle(sk)} data-testid={`chip-train-${sk}`}>{nm.skill(sk)}</button>)}</div>
    <div className="dc-row"><input className="dc-input" placeholder={t('Or search any topic, e.g. “Power BI”')} value={extra} maxLength={80} onChange={e => setExtra(e.target.value)} aria-label={t('Search any topic')} data-testid="input-training-keyword" /></div>
    {!findings.length ? <p className="dc-note" data-testid="text-training-empty">{t('Pick a team, a role or at least one skill to see training.')}</p> : <div className="dc-list" style={{ marginTop: 12 }} data-testid="list-training-results">{findings.map(f => <article className="dc-card" key={f.label} data-testid={`train-${f.label}`}>
      <div className="dc-top"><div><h3>{f.kind === 'role' ? `${t('Role')}: ${nm.role(f.name)}` : f.kind === 'search' ? `${t('Search')}: ${f.name}` : nm.skill(f.name)}</h3><p>{t('Search terms')}: “{f.query}”</p></div>
        {f.kind === 'skill' && (recommended(f.name) ? <span className="og-ok"><Check size={12} /> {t('Recommended')}</span> : <button className="quiet-button" disabled={a.busy} onClick={() => recommend(f.name)} data-testid={`button-train-skill-${f.label}`}>{t('Recommend skill to {audience}', { audience })}</button>)}</div>
      {f.featured.length > 0 && <div className="og-feat"><small>{t('Hand-picked starting points')}</small>{f.featured.map(c => <div className="og-featrow" key={c.url + c.title}><div><a className="link" href={c.url} target="_blank" rel="noreferrer">{c.title} <ExternalLink size={11} style={{ verticalAlign: '-2px' }} /></a><small>{c.provider} · {cost(c.cost)} · {t('about {h} h', { h: c.hours })}</small></div>
        <button className="quiet-button" disabled={a.busy} onClick={() => recommend(f.name, c)} data-testid={`button-train-course-${c.title}`}>{t('Recommend this course')}</button></div>)}</div>}
      <div className="og-feat"><small>{t('Search on')}</small><div className="og-links">{f.searches.map(s => <a key={s.provider} className="outline-button" href={s.url} target="_blank" rel="noreferrer" data-testid={`link-search-${f.label}-${s.provider}`}>{s.provider} <ExternalLink size={11} style={{ verticalAlign: '-2px' }} /></a>)}</div></div>
    </article>)}</div>}
    {a.err && <p className="dc-err" role="alert">{a.err}</p>}
    <p className="og-note">{t('Featured courses are suggestions, not endorsements: check content, price and availability on the provider. Search links open the provider’s own results (in English); Nexora does not fetch or rank them. Prices vary and some certificates are paid.')}</p>
  </section>;
}

function Employees({ data }: { data: AdminView }) {
  const { t, tp } = useT(); const nm = useNames();
  const a = useAction(); const hidden = data.counts.joined - data.counts.sharing;
  const [q, setQ] = useState(''); const [teamF, setTeamF] = useState('');
  const shown = data.members.filter(m => (!q.trim() || `${m.name} ${m.currentRole} ${m.skills.join(' ')} ${m.skills.map(nm.skill).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())) && (!teamF || (teamF === 'none' ? !m.teamId : m.teamId === teamF)));
  const direction = (id: string | null) => { const d = DIRECTIONS.find(x => x.id === id); return d ? nm.role(d.title) : id ? id : t('Not chosen yet'); };
  return <section className="panel"><div className="eyebrow">{t('Employees')}</div><h2>{t('Employees who share their skills')}</h2>
    {!data.members.length ? <><p className="dc-note">{t('No employees are sharing yet. Give them the join code from Overview; they choose whether to share.')}</p><LoadTestData /></> : <>
      <div className="dc-row" style={{ marginTop: 8 }}><input className="dc-input" placeholder={t('Search name, role or skill')} value={q} onChange={e => setQ(e.target.value)} aria-label={t('Search employees')} data-testid="input-search-employees" />
        <select className="og-select" value={teamF} onChange={e => setTeamF(e.target.value)} aria-label={t('Filter by team')} data-testid="select-filter-team"><option value="">{t('All teams')}</option><option value="none">{t('No team')}</option>{data.teams.map(x => <option key={x.id} value={x.id}>{nm.team(x.name)}</option>)}</select>
        <span className="og-note" data-testid="text-employee-count" style={{ margin: 0 }}>{t('{a} of {b}', { a: shown.length, b: data.members.length })}</span></div>
      <div style={{ marginTop: 8 }}>{shown.map((m: AdminMember) => <div className="og-row" key={m.id} data-testid={`employee-${m.name}`}>
      <div><b>{m.name}</b><small>{m.currentRole ? nm.position(m.currentRole) : t('Role not set')}</small></div>
      <div><small>{t('Skills')}</small>{m.skills.length}</div>
      <div><small>{t('Chosen direction')}</small>{direction(m.goalRoleId)}<small>{tp(m.completedSteps, '{n} step done', '{n} steps done')}</small></div>
      <select value={m.teamId ?? ''} disabled={a.busy} onChange={e => a.run(() => api('PUT', `/org/admin/members/${m.id}/team`, { teamId: e.target.value || null }))} aria-label={t('Team for {name}', { name: m.name })}><option value="">{t('No team')}</option>{data.teams.map(x => <option key={x.id} value={x.id}>{nm.team(x.name)}</option>)}</select></div>)}
      {!shown.length && <p className="dc-note">{t('No employees match.')}</p>}</div></>}
    {hidden > 0 && <p className="og-note"><Users size={12} style={{ verticalAlign: '-2px' }} /> {t('{who} joined but not sharing, so they do not appear here. Training recommended for the whole company still reaches them.', { who: tp(hidden, '{n} more employee has', '{n} more employees have') })}</p>}
    {a.err && <p className="dc-err">{a.err}</p>}</section>;
}

function CompanyCard({ data }: { data: AdminView }) {
  const { t } = useT(); const nm = useNames();
  const c = data.company; const a = useAction(); const [f, setF] = useState<CompanyDetails>(c); const [saved, setSaved] = useState(false);
  const set = (k: keyof CompanyDetails) => (e: { target: { value: string } }) => { setSaved(false); setF(v => ({ ...v, [k]: e.target.value })); };
  const save = async (e: FormEvent) => { e.preventDefault(); const { name: _n, registrationNumber: _r, ...rest } = f; if (await a.run(() => api('PUT', '/org/admin/details', rest))) setSaved(true); };
  return <form className="panel" onSubmit={save} data-testid="form-company-details"><div className="eyebrow">{t('Registered company')}</div><h2>{c.name}</h2>
    <dl className="og-dl"><div><dt>{t('Registration number')}</dt><dd data-testid="text-registration-number">{c.registrationNumber}</dd></div><div><dt>{t('Company name')}</dt><dd>{c.name}</dd></div></dl>
    <p className="og-note" style={{ marginTop: 0 }}>{t('The company name and registration number cannot be changed after registration. To correct them, delete this workspace and register again.')}</p>
    <div className="og-form">
      <Field label={t('Business licence number')}><input className="dc-input" value={f.licenseNumber} onChange={set('licenseNumber')} maxLength={40} /></Field>
      <Field label={t('Industry')}><select className="og-select" value={f.industry} onChange={set('industry')}>{INDUSTRIES.map(i => <option key={i} value={i}>{nm.industry(i)}</option>)}</select></Field>
      <Field label={t('Number of employees')}><select className="og-select" value={f.companySize} onChange={set('companySize')}>{SIZES.map(i => <option key={i}>{i}</option>)}</select></Field>
      <Field label={t('Website')}><input className="dc-input" value={f.website} onChange={set('website')} maxLength={200} /></Field>
      <Field label={t('Address')}><input className="dc-input" value={f.addressLine} onChange={set('addressLine')} maxLength={200} /></Field>
      <Field label={t('City')}><input className="dc-input" value={f.city} onChange={set('city')} maxLength={100} /></Field>
      <Field label={t('State / region')}><input className="dc-input" value={f.state} onChange={set('state')} maxLength={100} /></Field>
      <Field label={t('Postcode')}><input className="dc-input" value={f.postcode} onChange={set('postcode')} maxLength={12} /></Field>
      <Field label={t('Country')}><input className="dc-input" value={f.country} onChange={set('country')} maxLength={60} /></Field>
      <Field label={t('Contact name')}><input className="dc-input" value={f.contactName} onChange={set('contactName')} maxLength={100} /></Field>
      <Field label={t('Contact email')}><input className="dc-input" type="email" value={f.contactEmail} onChange={set('contactEmail')} maxLength={200} /></Field>
      <Field label={t('Contact phone')}><input className="dc-input" type="tel" value={f.contactPhone} onChange={set('contactPhone')} maxLength={20} /></Field>
    </div>
    {a.err && <p className="dc-err" role="alert">{a.err}</p>}
    <div className="og-actions"><button className="primary-button" disabled={a.busy} data-testid="button-save-company">{a.busy ? t('Saving…') : t('Save changes')}</button>{saved && <span className="og-ok" role="status">{t('Saved.')}</span>}</div>
  </form>;
}
