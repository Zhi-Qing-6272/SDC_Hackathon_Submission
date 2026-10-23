import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ExternalLink, FileUp, Sparkles } from 'lucide-react';
import { QUESTIONS, extract, matchVacancies, readFileText, suggestDirections, type Vacancy } from '@/lib/discovery';
import './discover.css';

type P = { name: string; currentRole: string; experience: string; skills: string[]; interests: string[] };
const uniq = (a: string[]) => [...new Map(a.map(x => [x.toLowerCase(), x])).values()];

export function Discover({ profile, onSave, onPathway }: { profile: P; onSave: (p: P) => Promise<void>; onPathway: (id: string) => void }) {
  const [tab, setTab] = useState<'cv' | 'paste' | 'quiz'>('cv');
  const [skills, setSkills] = useState<string[]>(profile.skills);
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [name, setName] = useState(profile.name);
  const [text, setText] = useState('');
  const [answers, setAnswers] = useState<Set<string>>(new Set());
  const [note, setNote] = useState(''); const [err, setErr] = useState(''); const [saving, setSaving] = useState(false);
  const [vacancies, setVacancies] = useState<Vacancy[] | null>(null); const [vErr, setVErr] = useState(false);

  useEffect(() => { fetch('/api/vacancies').then(r => r.ok ? r.json() : Promise.reject()).then(d => setVacancies(d.vacancies)).catch(() => setVErr(true)); }, []);
  const merge = (found: { skills: string[]; interests: string[] }, label: string) => {
    setSkills(s => uniq([...s, ...found.skills])); setInterests(i => uniq([...i, ...found.interests]));
    setNote(`${label}: found ${found.skills.length} skills and ${found.interests.length} interests. Review them below.`); setErr('');
  };
  const onFile = async (f?: File) => { if (!f) return; try { merge(extract(await readFileText(f)), f.name); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not read this file.'); setNote(''); } };
  const applyQuiz = () => {
    const picked = QUESTIONS.flatMap(q => q.options.filter(o => answers.has(`${q.q}|${o.label}`)));
    merge({ skills: picked.flatMap(o => o.skills ?? []), interests: picked.flatMap(o => o.interests ?? []) }, 'Questionnaire');
  };
  const directions = useMemo(() => suggestDirections(skills, interests), [skills, interests]);
  const jobs = useMemo(() => vacancies ? matchVacancies(vacancies, skills) : [], [vacancies, skills]);
  const dirty = JSON.stringify([skills, interests, name]) !== JSON.stringify([profile.skills, profile.interests, profile.name]);
  const save = async () => { if (!name.trim() || !skills.length) { setErr('Add a name and at least one skill first.'); return; } setSaving(true); try { await onSave({ ...profile, name: name.trim(), skills, interests }); setNote('Saved to your profile.'); setErr(''); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save.'); } setSaving(false); };
  const chip = (v: string, rm: () => void) => <button key={v} className="skill-chip on" onClick={rm} title="Remove">{v} ×</button>;

  return <>
    <div className="page-head"><div><div className="eyebrow">Nexora · discover</div><h1>Find directions and vacancies that fit you.</h1>
      <p className="page-subtitle">Upload a CV, paste your experience or answer a short questionnaire. Suggestions update from the skills and interests you keep, and the number of results depends on how well they match.</p></div></div>

    <section className="panel"><div className="panel-head"><div><div className="eyebrow">Step 1</div><h2>Tell us about yourself</h2></div></div>
      <div className="dc-tabs">{([['cv', 'Upload CV'], ['paste', 'Paste text'], ['quiz', 'Questionnaire']] as const).map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'cv' && <label className="dc-drop"><FileUp size={22} /><br />Choose a CV file (.docx, .txt or .md)<input type="file" accept=".docx,.txt,.md,.pdf" onChange={e => onFile(e.target.files?.[0])} /></label>}
      {tab === 'paste' && <><textarea className="dc-ta" value={text} onChange={e => setText(e.target.value)} placeholder="Paste your CV, LinkedIn summary or a description of what you have done…" /><button className="primary-button" onClick={() => merge(extract(text), 'Text')} disabled={!text.trim()}>Find skills in this text</button></>}
      {tab === 'quiz' && <>{QUESTIONS.map(q => <div className="dc-q" key={q.q}><b>{q.q}</b><div className="skill-chips">{q.options.map(o => { const k = `${q.q}|${o.label}`; return <button key={k} className={`skill-chip ${answers.has(k) ? 'on' : ''}`} onClick={() => setAnswers(a => { const n = new Set(a); n.has(k) ? n.delete(k) : n.add(k); return n; })}>{o.label}</button>; })}</div></div>)}<button className="primary-button" onClick={applyQuiz} disabled={!answers.size}>Use my answers</button></>}
      <p className="dc-note">Your CV is read in this browser and is not uploaded or stored. Only the skills and interests you keep below are saved. Name, age, gender and background are never used for matching.</p>
      {note && <p className="dc-note" style={{ color: '#047857' }}>{note}</p>}{err && <p className="dc-err">{err}</p>}
    </section>

    <section className="panel section-gap"><div className="panel-head"><div><div className="eyebrow">Step 2</div><h2>Review your skills and interests</h2><p className="page-subtitle">Click a tag to remove it. Add more with the questionnaire or on the My profile page.</p></div></div>
      <div className="eyebrow">SKILLS ({skills.length})</div><div className="skill-chips">{skills.length ? skills.map(s => chip(s, () => setSkills(skills.filter(x => x !== s)))) : <span className="dc-note">None yet.</span>}</div>
      <div className="eyebrow" style={{ marginTop: 14 }}>INTERESTS ({interests.length})</div><div className="skill-chips">{interests.length ? interests.map(s => chip(s, () => setInterests(interests.filter(x => x !== s)))) : <span className="dc-note">None yet.</span>}</div>
      <div className="dc-row">{!profile.name && <input className="dc-input" placeholder="Name or preferred name" value={name} onChange={e => setName(e.target.value)} />}<button className="primary-button" onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save to my profile'}</button></div>
    </section>

    <section className="panel section-gap"><div className="panel-head"><div><div className="eyebrow">Step 3</div><h2>Suggested directions {skills.length + interests.length > 0 && <span style={{ color: '#64748B', fontWeight: 500 }}>({directions.length})</span>}</h2><p className="page-subtitle">Ranked by 70% skill overlap and 30% interest overlap. Only directions with a meaningful match are shown.</p></div></div>
      {!directions.length ? <p className="dc-note">Add skills or interests above to see suggested directions.</p> : <div className="dc-list">{directions.map(d => <article className="dc-card" key={d.id}>
        <div className="dc-top"><div><h3>{d.title}</h3><p>{d.summary}</p></div><span className="dc-score">{d.score}%</span></div>
        <div className="skill-chips">{d.skillHits.map(s => <span key={s} className="skill-chip">✓ {s}</span>)}{d.interestHits.map(s => <span key={s} className="skill-chip">♥ {s}</span>)}{d.gaps.slice(0, 3).map(s => <span key={s} className="skill-chip gap">+ {s}</span>)}</div>
        <a className="link" href="#" onClick={e => { e.preventDefault(); onPathway(d.id); }}>Choose and build learning pathway <ArrowRight size={12} style={{ verticalAlign: '-2px' }} /></a>
      </article>)}</div>}
    </section>

    <section className="panel section-gap"><div className="panel-head"><div><div className="eyebrow">Step 4</div><h2>Matching vacancies {vacancies && skills.length > 0 && <span style={{ color: '#64748B', fontWeight: 500 }}>({jobs.length} of {vacancies.length})</span>}</h2><p className="page-subtitle">Remote postings from <a href="https://himalayas.app" target="_blank" rel="noreferrer">Himalayas</a> (jobs by Himalayas), matched on the skills you keep. A global remote sample, not all Malaysian jobs.</p></div></div>
      {vErr ? <p className="dc-err">Could not load vacancies right now. Try again later.</p> : !vacancies ? <p className="dc-note">Loading vacancies…</p> : !skills.length ? <p className="dc-note">Add skills above to see matching vacancies.</p> : !jobs.length ? <p className="dc-note">No postings in the current sample match these skills.</p> :
        <div className="dc-list">{jobs.slice(0, 40).map(v => <article className="dc-card" key={v.id}>
          <div className="dc-top"><div><h3>{v.position}</h3><p>{v.company} · {v.location || 'Remote'}</p></div><span className="dc-score">{v.score}%</span></div>
          <div className="skill-chips">{v.matched.map(s => <span key={s} className="skill-chip">✓ {s}</span>)}{v.missing.slice(0, 3).map(s => <span key={s} className="skill-chip gap">+ {s}</span>)}</div>
          <a className="link" href={v.url} target="_blank" rel="noreferrer">View and apply on Himalayas <ExternalLink size={12} style={{ verticalAlign: '-2px' }} /></a></article>)}</div>}
      <p className="dc-note"><Sparkles size={12} style={{ verticalAlign: '-2px' }} /> Match % compares your skills with skills named in the posting title and tags. It is a planning aid, not a hiring decision.</p>
    </section>
  </>;
}
