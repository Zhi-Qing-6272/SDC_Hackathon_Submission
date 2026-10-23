import { useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Check, Copy, Mail, RefreshCw, Trash2, Users, X } from 'lucide-react';
import { api } from '@/lib/org-api';
import { useTeams, type InviteResult, type OwnedTeam } from '@/lib/team-api';
import './discover.css';
import './team-manager.css';
import { sdgLabel } from '@/lib/sdg';

type Language = 'EN' | 'BM' | '中文';
type Role = { id: string; title: string; skills: string[]; sdgs: string[]; steps: string[] };
type Course = { provider: string; url: string; cost: string; hours: number };
type Props = {
  language: Language; roles: Role[]; courses: Record<string, Course>; stepSkills: Record<string, string>;
  skillOptions?: string[]; labelSkill: (skill: string) => string; roleTitle: (id: string, fallback: string) => string;
};
// Strings that already existed keep their Malay and Chinese versions; the new team and invitation wording is English for now.
const OLD: Record<Language, Record<string, string>> = {
 "EN": {
  "skills": "Current skills",
  "heatmap": "Skills-gap heatmap",
  "heatmapNote": "Listed = reported skill; Gap = required for the chosen direction but not listed; — = not required. This is not an assessment of proficiency or a productivity ranking.",
  "listed": "Listed",
  "gap": "Gap",
  "plan": "Shared learning priorities",
  "planNote": "Ordered by how many members need each skill. Time estimates are planning guidance; check provider details and pricing.",
  "people": "members",
  "estimatedHours": "estimated hours",
  "noGaps": "All core skills for the selected directions are listed. Validate them through practice.",
  "sdg": "Team SDG associations",
  "sdgNote": "Counts represent members whose chosen role is associated with each goal. A person may appear under several goals. These are not measured impact.",
  "need": "Skills to build",
  "resource": "Open provider",
  "remove": "Remove",
  "loading": "Loading your team…",
  "retry": "Try again",
  "cancel": "Cancel",
  "members": "Saved team members"
 },
 "BM": {
  "skills": "Kemahiran semasa",
  "heatmap": "Peta haba jurang kemahiran",
  "heatmapNote": "Disenaraikan = kemahiran dilaporkan; Jurang = diperlukan tetapi belum disenaraikan; — = tidak diperlukan. Bukan penilaian kecekapan atau produktiviti.",
  "listed": "Disenaraikan",
  "gap": "Jurang",
  "plan": "Keutamaan pembelajaran bersama",
  "planNote": "Disusun mengikut bilangan ahli yang memerlukan setiap kemahiran. Masa hanya anggaran; semak butiran dan harga penyedia.",
  "people": "ahli",
  "estimatedHours": "anggaran jam",
  "noGaps": "Semua kemahiran teras hala tuju pilihan telah disenaraikan. Sahkan melalui latihan.",
  "sdg": "Perkaitan SDG pasukan",
  "sdgNote": "Bilangan ahli yang memilih peranan berkaitan setiap matlamat. Seorang mungkin dikira dalam beberapa matlamat. Bukan impak terukur.",
  "need": "Kemahiran untuk dibina",
  "resource": "Buka penyedia",
  "remove": "Padam",
  "loading": "Memuatkan pasukan…",
  "retry": "Cuba lagi",
  "cancel": "Batal",
  "members": "Ahli pasukan disimpan"
 },
 "中文": {
  "skills": "现有技能",
  "heatmap": "技能差距热力图",
  "heatmapNote": "已列出 = 报告的技能；差距 = 目标岗位需要但尚未列出；— = 不需要。这不是能力评估或生产力排名。",
  "listed": "已列出",
  "gap": "差距",
  "plan": "共同学习重点",
  "planNote": "按需要每项技能的成员人数排序。时间仅供规划，请核实课程详情和价格。",
  "people": "位成员",
  "estimatedHours": "预计小时",
  "noGaps": "已列出所有目标方向的核心技能，可通过实践验证。",
  "sdg": "团队 SDG 关联",
  "sdgNote": "数量代表所选岗位与各目标有关联的成员人数。一人可涉及多个目标，并非测量出的影响。",
  "need": "待培养技能",
  "resource": "打开学习平台",
  "remove": "删除",
  "loading": "正在加载团队…",
  "retry": "重试",
  "cancel": "取消",
  "members": "已保存的团队成员"
 }
};

const EN = {
  eyebrow: 'Your learning teams', heading: 'Plan reskilling together.',
  intro: 'Create a team first, then invite people by email. Someone joins only after they accept, and you plan learning from the skills they choose to share.',
  newTeam: 'Create a team', teamName: 'Team name', teamNamePh: 'e.g. Support team reskilling', goal: 'Shared direction', goalOwn: 'Each member’s own chosen direction', create: 'Create team',
  noTeamTitle: 'Create a team to get started', noTeamText: 'You need a team before you can invite anyone. Give it a name, then add members by email.',
  invite: 'Invite a member', inviteEmail: 'Their email address', inviteBtn: 'Send invitation',
  inviteNote: 'They are added to the team only after they accept. They will see exactly what you can see: their name, current role, skills and chosen direction.',
  pending: 'Waiting for a reply', noPending: 'No invitations waiting.', resend: 'Resend', cancelInv: 'Cancel invitation',
  statusPending: 'Pending', statusDeclined: 'Declined', statusExpired: 'Expired',
  invitesForYou: 'Invitations for you', accept: 'Accept and share', decline: 'Decline',
  acceptNote: 'If you accept, the team owner can see your name, current role, skills and chosen direction. Nothing else. You can leave at any time.',
  joinedTitle: 'Teams you belong to', leave: 'Leave team', leaveConfirm: 'Leave this team? The owner will stop seeing your details straight away.',
  owner: 'Owner', you: 'you', deleteTeam: 'Delete team', deleteConfirm: 'Delete this team, its members list and all invitations? This cannot be undone.',
  removeConfirm: 'Remove this member from the team?', noProfile: 'Has not saved a skills profile yet', noDirection: 'No direction chosen yet',
  teamMembers: 'Members', onlyYou: 'Only you so far. Invite people above.',
  emailSentTo: 'Invitation emailed to', notSentTitle: 'Email is not set up on this server, so nothing was sent.', notSentText: 'Share this private link with them yourself. It only works when they sign in with the invited email address.', copy: 'Copy link', copied: 'Copied',
  needNote: 'Skills to build', hoursLabel: 'estimated hours', directionLabel: 'Direction',
  teamPrivacy: 'Members share only their name, current role, skills and chosen direction, and only after accepting. Never interests, experience notes or CV text.',
};
type Dict = typeof EN & Record<string, string>;
const hasSkill = (skills: string[], value: string) => skills.some(skill => skill.toLowerCase() === value.toLowerCase());
const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function TeamManager({ language, roles, courses, stepSkills, labelSkill, roleTitle }: Props) {
  const t = { ...EN, ...OLD[language] } as Dict;
  const qc = useQueryClient();
  const query = useTeams();
  const data = query.data;
  const [sel, setSel] = useState(''); const [name, setName] = useState(''); const [target, setTarget] = useState('');
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [notice, setNotice] = useState('');
  const [sent, setSent] = useState<InviteResult | null>(null); const [copied, setCopied] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['teams'] });
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(''); try { await fn(); await refresh(); return true; } catch (e) { setErr(e instanceof Error ? e.message : 'Something went wrong.'); return false; } finally { setBusy(false); } };

  const owned = data?.owned ?? [];
  const team: OwnedTeam | undefined = owned.find(x => x.id === sel) ?? owned[0];
  const roleOf = (id: string | null) => roles.find(r => r.id === id);
  const details = useMemo(() => (team?.members ?? []).map(member => {
    const role = roleOf(team!.targetRoleId ?? member.goalRoleId);
    const gaps = role ? role.skills.filter(skill => !hasSkill(member.skills, skill)) : [];
    const steps = role ? role.steps.filter(step => !hasSkill(member.skills, stepSkills[step])) : [];
    return { member, role, gaps, steps, hours: steps.reduce((sum, step) => sum + (courses[step]?.hours ?? 0), 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [team, roles, stepSkills, courses]);
  const planned = details.filter(d => d.role) as (typeof details[number] & { role: Role })[];
  const requiredSkills = [...new Set(planned.flatMap(d => d.role.skills))];
  const sharedPlan = useMemo(() => { const plan = new Map<string, number>(); for (const d of planned) for (const step of d.steps) plan.set(step, (plan.get(step) ?? 0) + 1); return [...plan.entries()].sort((a, b) => b[1] - a[1]); }, [planned]);
  const goals = [...new Set(roles.flatMap(role => role.sdgs.map(goal => goal.split(' · ')[0])))];

  const createTeam = async (e: FormEvent) => { e.preventDefault(); setSent(null); setNotice(''); const ok = await run(async () => { const r = await api<{ id: string }>('POST', '/teams', { name, targetRoleId: target || null }); setSel(r.id); }); if (ok) { setName(''); setTarget(''); } };
  const sendInvite = async (e: FormEvent) => {
    e.preventDefault(); if (!team) return; setSent(null); setNotice('');
    const ok = await run(async () => { setSent(await api<InviteResult>('POST', `/teams/${team.id}/invitations`, { email })); });
    if (ok) setEmail('');
  };
  const resend = (id: string) => { if (!team) return; setSent(null); setNotice(''); run(async () => { setSent(await api<InviteResult>('POST', `/teams/${team.id}/invitations/${id}/resend`)); }); };
  const copy = async (link: string) => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* the link is shown, so it can be selected by hand */ } };
  const answer = (id: string, action: 'accept' | 'decline') => run(() => api('POST', `/invitations/${id}/${action}`));

  return <>
    <div className="page-head"><div><div className="eyebrow">{t.eyebrow}</div><h1>{t.heading}</h1><p className="page-subtitle">{t.intro}</p></div></div>
    <div className="callout">{t.teamPrivacy}</div>
    {query.isLoading && <p className="team-note">{t.loading}</p>}
    {query.isError && <div className="error-state section-gap">{query.error.message}<br /><button className="outline-button" onClick={() => query.refetch()}>{t.retry}</button></div>}
    {err && <p className="dc-err" role="alert" data-testid="text-team-error">{err}</p>}
    {notice && <div className="workspace-feedback section-gap" role="status">{notice}</div>}

    {!!data?.invitations.length && <section className="panel section-gap" data-testid="panel-my-invitations"><div className="eyebrow">{t.invitesForYou}</div>
      {data.invitations.map(inv => <article className="tm-invite" key={inv.id} data-testid={`my-invite-${inv.id}`}>
        <div><h3>{inv.teamName}</h3><p>{inv.inviterName} invited you ({inv.email}). Expires {when(inv.expiresAt)}.</p><p className="team-note">{t.acceptNote}</p></div>
        <div className="tm-actions"><button className="primary-button" disabled={busy} onClick={() => answer(inv.id, 'accept')} data-testid={`button-accept-${inv.id}`}><Check size={14} /> {t.accept}</button><button className="outline-button" disabled={busy} onClick={() => answer(inv.id, 'decline')} data-testid={`button-decline-${inv.id}`}>{t.decline}</button></div>
      </article>)}</section>}

    {!!data?.joined.length && <section className="panel section-gap" data-testid="panel-joined"><div className="eyebrow">{t.joinedTitle}</div>
      {data.joined.map(j => <article className="tm-invite" key={j.id}><div><h3>{j.name}</h3><p>Owner: {j.ownerName} · {j.memberCount} {t.people}{j.targetRoleId ? ` · ${t.directionLabel}: ${roleTitle(j.targetRoleId, roleOf(j.targetRoleId)?.title ?? j.targetRoleId)}` : ''}</p></div>
        <div className="tm-actions"><button className="outline-button" disabled={busy} onClick={() => { if (window.confirm(t.leaveConfirm)) run(() => api('DELETE', `/teams/${j.id}/membership`)); }} data-testid={`button-leave-team-${j.id}`}>{t.leave}</button></div></article>)}</section>}

    {data && !owned.length && <div className="empty-state section-gap" data-testid="team-empty"><Users size={25} /><h2>{t.noTeamTitle}</h2><p>{t.noTeamText}</p></div>}

    {data && <section className="panel section-gap"><div className="eyebrow">{owned.length ? 'New team' : 'Step 1'}</div><h2>{t.newTeam}</h2>
      <form className="tm-form" onSubmit={createTeam} data-testid="form-create-team">
        <div className="field"><label htmlFor="tm-name">{t.teamName}</label><input id="tm-name" className="dc-input" value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder={t.teamNamePh} data-testid="input-team-name" /></div>
        <div className="field"><label htmlFor="tm-goal">{t.goal}</label><select id="tm-goal" className="og-select" value={target} onChange={e => setTarget(e.target.value)} data-testid="select-team-goal"><option value="">{t.goalOwn}</option>{roles.map(r => <option key={r.id} value={r.id}>{roleTitle(r.id, r.title)}</option>)}</select></div>
        <button className="primary-button" disabled={busy || name.trim().length < 2} data-testid="button-create-team">{t.create}</button>
      </form></section>}

    {team && <>
      <section className="panel section-gap" data-testid="panel-team">
        <div className="panel-head"><div><div className="eyebrow">{owned.length > 1 ? 'Team' : 'Your team'}</div><h2>{team.name}</h2></div>
          <button className="quiet-button danger-button" disabled={busy} onClick={() => { if (window.confirm(t.deleteConfirm)) run(async () => { await api('DELETE', `/teams/${team.id}`); setSel(''); }); }} data-testid="button-delete-team"><Trash2 size={14} /> {t.deleteTeam}</button></div>
        {owned.length > 1 && <div className="tm-tabs" role="tablist">{owned.map(o => <button key={o.id} role="tab" aria-selected={o.id === team.id} className={`jc-chip ${o.id === team.id ? 'on' : ''}`} onClick={() => { setSel(o.id); setSent(null); }}>{o.name}</button>)}</div>}
        <div className="field" style={{ maxWidth: 360 }}><label htmlFor="tm-goal-edit">{t.goal}</label>
          <select id="tm-goal-edit" className="og-select" value={team.targetRoleId ?? ''} disabled={busy} onChange={e => run(() => api('PUT', `/teams/${team.id}`, { targetRoleId: e.target.value || null }))} data-testid="select-team-goal-edit"><option value="">{t.goalOwn}</option>{roles.map(r => <option key={r.id} value={r.id}>{roleTitle(r.id, r.title)}</option>)}</select></div>
      </section>

      <section className="panel section-gap"><div className="eyebrow">Step 2</div><h2>{t.invite}</h2>
        <form className="tm-form" onSubmit={sendInvite} data-testid="form-invite">
          <div className="field"><label htmlFor="tm-email">{t.inviteEmail}</label><input id="tm-email" className="dc-input" type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={200} placeholder="name@example.com" autoComplete="off" data-testid="input-invite-email" /></div>
          <button className="primary-button" disabled={busy || !email.includes('@')} data-testid="button-send-invite"><Mail size={14} /> {t.inviteBtn}</button>
        </form>
        <p className="team-note">{t.inviteNote}</p>
        {sent?.emailSent && <div className="workspace-feedback" role="status" data-testid="text-invite-sent">{t.emailSentTo} <b>{sent.email}</b>. They join only after they accept.</div>}
        {sent && !sent.emailSent && sent.link && <div className="tm-link" data-testid="box-invite-link"><b>{t.notSentTitle}</b><p>{t.notSentText}</p>
          <div className="dc-row"><input className="dc-input" readOnly value={sent.link} onFocus={e => e.currentTarget.select()} aria-label="Invitation link" data-testid="input-invite-link" /><button type="button" className="outline-button" onClick={() => copy(sent.link!)}><Copy size={13} /> {copied ? t.copied : t.copy}</button></div></div>}

        <h3 className="tm-sub">{t.pending}</h3>
        {!team.invitations.length ? <p className="team-note" style={{ marginTop: 4 }}>{t.noPending}</p> : <div className="tm-list">{team.invitations.map(inv => <div className="tm-row" key={inv.id} data-testid={`invite-${inv.email}`}>
          <div><b>{inv.email}</b><span className={`tm-chip tm-${inv.status}`}>{inv.status === 'pending' ? t.statusPending : inv.status === 'declined' ? t.statusDeclined : t.statusExpired}</span><small>Sent {when(inv.createdAt)}{inv.status === 'pending' ? ` · expires ${when(inv.expiresAt)}` : ''}</small></div>
          <div className="tm-actions"><button className="outline-button" disabled={busy} onClick={() => resend(inv.id)} data-testid={`button-resend-${inv.email}`}><RefreshCw size={13} /> {t.resend}</button>
            <button className="icon-button danger-button" disabled={busy} aria-label={`${t.cancelInv}: ${inv.email}`} onClick={() => run(() => api('DELETE', `/teams/${team.id}/invitations/${inv.id}`))}><X size={14} /></button></div></div>)}</div>}
      </section>

      <section className="panel section-gap" data-testid="panel-members"><div className="eyebrow">{team.members.length} {t.people}</div><h2>{t.teamMembers}</h2>
        {team.members.length < 2 && <p className="team-note">{t.onlyYou}</p>}
        <div className="team-records">{details.map(({ member, role, gaps, hours }) => <article className="team-record" key={member.id} data-testid={`team-member-${member.id}`}>
          <div><h3>{member.name} {member.isOwner && <span className="tm-chip tm-owner">{t.owner} · {t.you}</span>}</h3>
            <p>{member.currentRole || '—'} · {role ? roleTitle(role.id, role.title) : t.noDirection}</p>
            {!member.hasProfile && <p className="team-note">{t.noProfile}</p>}
            {role && <><p>{t.needNote}: {gaps.length ? gaps.map(labelSkill).join(', ') : '—'}</p><span className="field-hint">{hours} {t.estimatedHours}</span></>}</div>
          {!member.isOwner && <div className="team-record-actions"><button className="icon-button danger-button" disabled={busy} aria-label={`${t.remove}: ${member.name}`} onClick={() => { if (window.confirm(t.removeConfirm)) run(() => api('DELETE', `/teams/${team.id}/members/${member.id}`)); }}><Trash2 size={14} /></button></div>}
        </article>)}</div></section>

      {!!planned.length && <>
        <section className="panel section-gap"><h2>{t.heatmap}</h2><p className="team-note">{t.heatmapNote}</p><div className="team-table-wrap"><table className="team-skills-table"><thead><tr><th>{t.skills}</th>{planned.map(({ member }) => <th key={member.id}>{member.name}</th>)}</tr></thead><tbody>{requiredSkills.map(skill => <tr key={skill}><th>{labelSkill(skill)}</th>{planned.map(({ member, role }) => { const listed = hasSkill(member.skills, skill); const gap = role.skills.includes(skill) && !listed; return <td key={member.id}><span className={listed ? 'matrix-cell listed' : gap ? 'matrix-cell missing' : 'matrix-cell'}>{listed ? t.listed : gap ? t.gap : '—'}</span></td>; })}</tr>)}</tbody></table></div></section>
        <div className="grid two-col section-gap">
          <section className="panel"><h2>{t.plan}</h2><p className="team-note">{t.planNote}</p>{!sharedPlan.length ? <p className="callout">{t.noGaps}</p> : <ol className="shared-plan">{sharedPlan.map(([step, count]) => <li key={step}><div><h3>{step}</h3><p>{labelSkill(stepSkills[step])} · {count} {t.people} · {courses[step].hours} {t.estimatedHours}</p><p>{courses[step].provider} · {courses[step].cost}</p></div><a href={courses[step].url} target="_blank" rel="noreferrer" aria-label={`${t.resource}: ${step}`}><ArrowUpRight size={17} /></a></li>)}</ol>}</section>
          <section className="panel"><h2>{t.sdg}</h2><p className="team-note">{t.sdgNote}</p><div className="team-sdg-list">{goals.map(goal => { const count = planned.filter(({ role }) => role.sdgs.some(item => item.split(' · ')[0] === goal)).length; return <div className="team-sdg-row" key={goal}><span className="sdg-tag" data-sdg={goal.match(/SDG\s*(\d+)/)?.[1] ?? ''}>{sdgLabel(goal)}</span><div className="progress-line"><span style={{ width: `${count / planned.length * 100}%` }} data-sdg={goal.match(/SDG\s*(\d+)/)?.[1] ?? ''} /></div><b className="data-num">{count}</b></div>; })}</div></section>
        </div></>}
    </>}
  </>;
}
