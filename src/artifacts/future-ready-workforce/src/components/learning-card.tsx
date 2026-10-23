import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { buildSteps, suggestDirections, type Step } from '@/lib/discovery';
import { summarise } from '@/lib/achievements';
import { BadgeStrip, Bar, ProgressPanel, useBadges } from './gamify';
import './discover.css';

// Overview card: level, progress bar for the chosen pathway, and a strip of badges.
export function LearningCard({ profile, completedKeys, assignedKeys, chosenDir, curated, onContinue, onCompany }: {
  profile: { skills: string[]; interests: string[] }; completedKeys: string[]; assignedKeys: string[]; chosenDir: string | null;
  curated: (id: string) => Step[] | null; onContinue: () => void; onCompany: () => void;
}) {
  const directions = useMemo(() => suggestDirections(profile.skills, profile.interests), [profile]);
  const current = directions.find(d => d.id === chosenDir) ?? directions[0];
  const steps = current ? buildSteps(current, curated(current.id)) : null;
  const s = summarise({ skillCount: profile.skills.length, completedKeys, steps, assignedKeys });
  const { badges, earnedCount } = useBadges(s);
  const pending = assignedKeys.filter(k => !completedKeys.includes(k)).length;
  const nb = badges.filter(b => !b.earned).sort((a, b) => (b.value / b.target) - (a.value / a.target))[0];
  return <section className="panel section-gap" data-testid="card-learning-progress">
    <div className="eyebrow">Your learning progress</div>
    <div style={{ marginTop: 10 }}><ProgressPanel s={s} direction={current?.title} badgeCount={earnedCount} /></div>
    <BadgeStrip badges={badges} />
    {nb && <p className="dc-note" style={{ marginTop: 10 }}>Next badge: <b>{nb.title}</b> ({nb.value} of {nb.target}).</p>}
    {pending > 0 && <div className="gm-next"><button className="quiet-button" style={{ padding: 0 }} onClick={onCompany}>{pending} training item{pending === 1 ? '' : 's'} recommended by your company <ArrowRight size={12} /></button></div>}
    <button className="quiet-button" style={{ paddingLeft: 0, marginTop: 10 }} onClick={onContinue} data-testid="button-continue-learning">{s.stepsCompleted ? 'Continue learning' : 'Start your pathway'} <ArrowRight size={13} /></button>
  </section>;
}
