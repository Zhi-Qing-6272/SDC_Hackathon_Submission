import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ExternalLink } from 'lucide-react';
import { buildSteps, suggestDirections, type Step } from '@/lib/discovery';
import { summarise, XP_PER_STEP } from '@/lib/achievements';
import { BadgeGrid, ProgressPanel, Toast, useBadges } from './gamify';
import './discover.css';

type P = { skills: string[]; interests: string[] };

export function Pathway({ profile, completedKeys, assignedKeys, selectedId, onSelect, curated, onToggle, onDiscover }: {
  profile: P; completedKeys: string[]; assignedKeys: string[]; selectedId: string | null; onSelect: (id: string) => void;
  curated: (dirId: string) => Step[] | null; onToggle: (key: string) => Promise<void>; onDiscover: () => void;
}) {
  const directions = useMemo(() => suggestDirections(profile.skills, profile.interests), [profile]);
  const current = directions.find(d => d.id === selectedId) ?? directions[0];
  const [busy, setBusy] = useState(''); const [err, setErr] = useState(''); const [pathwayDone, setPathwayDone] = useState('');
  useEffect(() => { if (current && current.id !== selectedId) onSelect(current.id); }, [current?.id]);

  const steps: Step[] | null = current ? buildSteps(current, curated(current.id)) : null;
  const s = summarise({ skillCount: profile.skills.length, completedKeys, steps, assignedKeys });
  const { badges, earnedCount, fresh, dismiss } = useBadges(s);
  const prev = useRef<{ id?: string; pct: number }>({ pct: s.pct });
  useEffect(() => {
    if (current && prev.current.id === current.id && prev.current.pct < 100 && s.pct === 100 && s.total > 0) setPathwayDone(current.title);
    prev.current = { id: current?.id, pct: s.pct };
    if (prev.current.id !== current?.id) setPathwayDone('');
  }, [s.pct, current?.id]);

  if (!current || !steps) return <><div className="page-head"><div><div className="eyebrow">Learning pathway</div><h1>Choose a direction first.</h1><p className="page-subtitle">Your learning pathway is built from the direction you choose. Add skills and interests in Discover to see suggested directions.</p></div></div><button className="primary-button" onClick={onDiscover}>Go to Discover</button></>;

  const done = new Set(completedKeys);
  const hours = steps.reduce((n, x) => n + x.hours, 0);
  const toggle = async (key: string) => { setBusy(key); setErr(''); try { await onToggle(key); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save progress.'); } setBusy(''); };
  const nb = badges.filter(b => !b.earned).sort((a, b) => (b.value / b.target) - (a.value / a.target))[0];

  return <>
    <Toast fresh={fresh} pathwayDone={pathwayDone} onClose={() => { dismiss(); setPathwayDone(''); }} />
    <div className="page-head"><div><div className="eyebrow">Learning pathway</div><h1>A learning plan for {current.title}.</h1>
      <p className="page-subtitle">Built from the direction you choose and the skills it asks for that are not in your profile yet. Time estimates are planning guidance; check each provider for current content and pricing.</p></div></div>

    <section className="panel" data-testid="panel-progress"><div className="panel-head"><div><div className="eyebrow">Your progress</div><h2>Keep your momentum</h2></div></div>
      <ProgressPanel s={s} direction={current.title} badgeCount={earnedCount} />
      {nb && <div className="gm-next">Next badge: <b>{nb.title}</b>, {nb.description.toLowerCase()} ({nb.value} of {nb.target}).</div>}</section>

    <section className="panel section-gap"><div className="panel-head"><div><div className="eyebrow">Your suggested directions ({directions.length})</div><h2>Choose a direction</h2></div></div>
      <div className="skill-chips">{directions.map(d => <button key={d.id} className={`skill-chip ${d.id === current.id ? 'on' : ''}`} onClick={() => onSelect(d.id)}>{d.title} · {d.score}%</button>)}</div></section>

    <section className="panel section-gap"><div className="panel-head"><div><div className="eyebrow">{s.done} of {steps.length} steps complete · about {hours} hours</div><h2>{current.title}</h2><p className="page-subtitle">{current.summary}</p></div></div>
      {current.skillHits.length > 0 && <p className="dc-note" style={{ marginTop: 0, marginBottom: 12 }}>Already in your profile: {current.skillHits.join(', ')}.</p>}
      {!steps.length ? <p className="dc-note">You already list every core skill for this direction. Use Discover to find matching vacancies.</p> : <div className="dc-list">{steps.map((st, i) => <article className={`dc-card ${done.has(st.key) ? 'is-done' : ''}`} key={st.key}>
        <div className="dc-top"><div><h3>{i + 1}. {st.skill ? `Build ${st.title}` : st.title}</h3><p>{st.provider} · about {st.hours} hours · {st.cost}{!done.has(st.key) && ` · +${XP_PER_STEP} XP`}</p></div>
          <button className={done.has(st.key) ? 'primary-button' : 'quiet-button'} disabled={busy === st.key} onClick={() => toggle(st.key)} data-testid={`button-step-${i}`}>{done.has(st.key) ? <><Check size={13} /> Complete</> : 'Mark complete'}</button></div>
        <a className="link" href={st.url} target="_blank" rel="noreferrer">Open provider <ExternalLink size={12} style={{ verticalAlign: '-2px' }} /></a></article>)}</div>}
      {err && <p className="dc-err">{err}</p>}
      <p className="dc-note">Completion is self-reported and saved to your account, not an accredited certification.</p></section>

    <section className="panel section-gap" data-testid="panel-achievements"><div className="panel-head"><div><div className="eyebrow">Achievements</div><h2>{earnedCount} of {badges.length} badges earned</h2><p className="page-subtitle">Badges are earned by completing steps and are remembered on this device. They are for motivation only, not a qualification.</p></div></div>
      <BadgeGrid badges={badges} /></section>
  </>;
}
