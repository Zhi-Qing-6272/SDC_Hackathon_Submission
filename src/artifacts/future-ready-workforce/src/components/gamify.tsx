import { useEffect, useRef, useState } from 'react';
import { Award, Compass, Flag, Footprints, Medal, Rocket, Star, Target, Trophy, UserCheck, Users, type LucideIcon } from 'lucide-react';
import type { Badge, BadgeId, Summary } from '@/lib/achievements';
import './gamify.css';

const ICONS: Record<BadgeId, LucideIcon> = { profile: UserCheck, first: Footprints, going: Rocket, collector: Star, committed: Medal, halfway: Flag, pathway: Trophy, explorer: Compass, team: Users, uptodate: Target };
const KEY = 'nexora-badges';
const read = (): BadgeId[] => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

// Badges stay earned once unlocked (remembered on this device), even if a pathway or assignment changes later.
export function useBadges(summary: Summary) {
  const [stored, setStored] = useState<BadgeId[]>(read);
  const [fresh, setFresh] = useState<Badge[]>([]);
  const first = useRef(true);
  const ids = summary.earned.map(b => b.id).join(',');
  useEffect(() => {
    const add = summary.earned.filter(b => !stored.includes(b.id));
    if (!add.length) { first.current = false; return; }
    const next = [...stored, ...add.map(b => b.id)];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    setStored(next);
    if (!first.current) setFresh(add); // stay quiet for badges already earned when the page first loads
    first.current = false;
  }, [ids]);
  const badges = summary.badges.map(b => ({ ...b, earned: b.earned || stored.includes(b.id), value: b.earned || stored.includes(b.id) ? b.target : b.value }));
  return { badges, earnedCount: badges.filter(b => b.earned).length, fresh, dismiss: () => setFresh([]) };
}

export const Bar = ({ pct, done, thin, label }: { pct: number; done?: boolean; thin?: boolean; label: string }) =>
  <div className={`gm-bar ${done ? 'done' : ''} ${thin ? 'thin' : ''}`} role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>;

export const Toast = ({ fresh, onClose, pathwayDone }: { fresh: Badge[]; onClose: () => void; pathwayDone?: string }) =>
  fresh.length || pathwayDone ? <div className="gm-toast" role="status" data-testid="badge-toast"><Award size={20} />
    <span>{pathwayDone ? <><b>Pathway complete!</b> You finished every step for {pathwayDone}. </> : null}{fresh.length ? <><b>New badge{fresh.length > 1 ? 's' : ''}:</b> {fresh.map(b => b.title).join(', ')}.</> : null}</span>
    <button onClick={onClose} aria-label="Dismiss">×</button></div> : null;

export function ProgressPanel({ s, direction, badgeCount }: { s: Summary; direction?: string; badgeCount: number }) {
  return <>
    <div className="gm-top"><div className="gm-level" aria-label={`Level ${s.level}`}><div><small>Level</small><b>{s.level}</b></div></div>
      <div><div style={{ fontWeight: 800, fontSize: 16 }}>{s.levelName}</div><div className="gm-meta" style={{ margin: '4px 0' }}><span><b>{s.xp} XP</b> · {s.stepsCompleted} step{s.stepsCompleted === 1 ? '' : 's'} completed · {badgeCount} of {s.badges.length} badges</span><span>{s.nextLevelName ? `${s.xpToNext} XP to ${s.nextLevelName}` : 'Top level reached'}</span></div>
        <Bar pct={s.levelPct} label="Progress to next level" /></div></div>
    {direction && s.total > 0 && <div className="gm-rows"><div><div className="gm-meta" style={{ marginTop: 0 }}><span><b>{direction}</b> pathway</span><span><b>{s.done}</b> of {s.total} steps · {s.pct}%</span></div><Bar pct={s.pct} done={s.pct === 100} label={`${direction} pathway progress`} /></div></div>}
  </>;
}

export function BadgeGrid({ badges }: { badges: Badge[] }) {
  return <div className="gm-badges" data-testid="badge-grid">{badges.map(b => { const Icon = ICONS[b.id]; return <div className={`gm-badge ${b.earned ? 'on' : 'off'}`} key={b.id} data-testid={`badge-${b.id}`}>
    <div className="gm-ico"><Icon size={19} /></div><b>{b.title}</b><small>{b.description}</small>
    {b.earned ? <em>Earned ✓</em> : <><Bar pct={Math.round(100 * b.value / b.target)} thin label={`${b.title} progress`} /><em>{b.value} / {b.target}</em></>}</div>; })}</div>;
}

export function BadgeStrip({ badges }: { badges: Badge[] }) {
  return <div className="gm-mini" aria-label="Badges">{badges.map(b => { const Icon = ICONS[b.id]; return <span key={b.id} className={b.earned ? 'on' : ''} title={`${b.title}${b.earned ? ' (earned)' : ` – ${b.description}`}`}><Icon size={15} /></span>; })}</div>;
}
