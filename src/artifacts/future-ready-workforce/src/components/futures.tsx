import { useMemo, useState } from 'react';
import { suggestDirections } from '@/lib/discovery';
import { ALL_JOBS_GROWTH, ARROW, BLS_AI_STATEMENT, BLS_AI_URL, BLS_PROJECTIONS_URL, COVERED, ITEMS, JOB_EXAMPLES, analyse, effects, findJobs, fmtJobs, fmtPay, occName, type Arrow } from '@/lib/ai-risk';
import './discover.css';
import './futures.css';

type P = { skills: string[]; interests: string[] };

const Arrows = ({ a, label }: { a: Arrow[]; label: string }) => a.length === 0 ? <span className="ai-na">–</span> :
  <span className="ai-arrows" title={`${label}: ${a.map(x => ARROW[x].word).join(' → ')}`} aria-label={`${label}: ${a.map(x => ARROW[x].word).join(', then ')}`}>
    {a.map((x, i) => <b key={i} className={`ai-a ai-${x}`}>{ARROW[x].sym}</b>)}</span>;

export function Futures({ profile }: { profile: P }) {
  const [all, setAll] = useState(false);
  const dirs = useMemo(() => suggestDirections(profile.skills, profile.interests).filter(d => effects(d.id)), [profile]);
  const shown = all ? dirs : dirs.slice(0, 5);

  return <section className="panel section-gap" data-testid="panel-futures">
    <div className="panel-head"><div><div className="eyebrow">AI threats and uncertainty</div><h2>What AI could change for jobs</h2>
      <p className="page-subtitle">Three threats and two big unknowns, and what each means for work.</p></div></div>

    <JobChecker />

    <div className="ai-items">{ITEMS.map(it => <div key={it.id} className="ai-item" data-testid={`item-${it.id}`}>
      <div className="ai-item-top"><b>{it.name}</b><span className={`ai-tag ${it.kind === 'Threat' ? 'ai-tag-t' : 'ai-tag-u'}`}>{it.kind === 'Threat' ? 'Threat' : 'Uncertain'}</span></div>
      <p>{it.how}</p>
      <dl><div><dt>Hits</dt><dd>{it.hits}</dd></div><div><dt>How long</dt><dd>{it.when}</dd></div></dl>
    </div>)}</div>

    <div className="ai-risk" data-testid="panel-ai-risk">
      <div className="eyebrow">AI risk to jobs and pay</div>
      <h3>What each one means for your suggested jobs</h3>
      <p className="ai-legend"><b className="ai-a ai-up">▲</b> rises <b className="ai-a ai-flat">▬</b> little change <b className="ai-a ai-down">▼</b> falls · <b>Jobs</b> = how many roles · <b>Pay</b> = salary · two arrows = slow → fast, or helps → hurts</p>
      {!dirs.length ? <p className="dc-note">Add skills or interests to your profile (or in Discover) to see your suggested jobs here.</p> : <>
        <div className="ai-cards">{shown.map(d => { const e = effects(d.id)!; return <div key={d.id} className="ai-card" data-testid={`row-ai-${d.id}`}>
          <div className="ai-card-head"><b>{d.title}</b>
            <small><a href={e.occ.url} target="_blank" rel="noreferrer">{e.occ.name}</a> · BLS: <span className={e.occ.growth < 0 ? 'fu-down' : e.occ.growth >= ALL_JOBS_GROWTH ? 'fu-up' : ''}>{e.occ.growth > 0 ? '+' : ''}{e.occ.growth}% jobs</span> · {fmtPay(e.occ.pay)}/yr · {fmtJobs(e.occ.jobs)} jobs</small></div>
          <table className="ai-eff"><thead><tr><th></th><th>Jobs</th><th>Pay</th></tr></thead><tbody>
            {ITEMS.map(it => <tr key={it.id}><td>{it.name}{it.range && <small>{it.range[0]} → {it.range[1]}</small>}</td>
              <td><Arrows a={e.byItem[it.id].jobs} label={`${it.name}, jobs`} /></td><td><Arrows a={e.byItem[it.id].pay} label={`${it.name}, pay`} /></td></tr>)}
          </tbody></table></div>; })}</div>
        {dirs.length > 5 && <button className="quiet-button" style={{ paddingLeft: 0 }} onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${dirs.length} suggested jobs`}</button>}
      </>}
      <details className="fu-assume"><summary>Basis and limits</summary>
        <p>Jobs and pay figures are US <a href={BLS_PROJECTIONS_URL} target="_blank" rel="noreferrer">BLS projections</a> (2025–35; all US jobs: +{ALL_JOBS_GROWTH}%), in US dollars. Each job is matched to the closest US occupation.</p>
        <p>The arrows are a simple estimate from those figures and each job’s skills, not a forecast. {BLS_AI_STATEMENT} <a href={BLS_AI_URL} target="_blank" rel="noreferrer">Read BLS on AI</a>.</p></details>
    </div>
  </section>;
}

function JobChecker() {
  const [q, setQ] = useState(''); const [asked, setAsked] = useState(''); const [pick, setPick] = useState(0);
  const matches = useMemo(() => findJobs(asked), [asked]);
  const key = matches[Math.min(pick, matches.length - 1)];
  const res = useMemo(() => (key ? analyse(key) : null), [key]);
  const go = (t: string) => { setQ(t); setAsked(t.trim()); setPick(0); };
  const downs = (id: string) => { const e = res!.byItem[id]; return (e.jobs.includes('down') ? 1 : 0) + (e.pay.includes('down') ? 1 : 0); };
  const rows = res ? [...ITEMS].sort((a, b) => downs(b.id) - downs(a.id)) : [];
  return <div className="jc" data-testid="panel-job-check">
    <div className="eyebrow">Check a job</div>
    <h3>Thinking of a job? See what AI could do to it</h3>
    <form className="jc-form" onSubmit={e => { e.preventDefault(); go(q); }}>
      <input className="dc-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Type a job, e.g. nurse, accountant, software developer" aria-label="Job you want" data-testid="input-job" />
      <button className="primary-button" type="submit" data-testid="button-check-job">Check</button></form>
    <div className="jc-ex">{JOB_EXAMPLES.map(x => <button key={x} type="button" className="jc-chip" onClick={() => go(x)}>{x}</button>)}</div>
    {asked && !res && <p className="dc-note" data-testid="text-job-nomatch">No match for “{asked}” yet. Try a more common title (we cover {COVERED} job types), for example one of the examples above.</p>}
    {res && <div className="jc-res" data-testid="result-job-check">
      <div className="jc-head"><div><b>{res.occ.name}</b>
        <small>Closest US job to “{asked}” · BLS: <span className={res.occ.growth < 0 ? 'fu-down' : res.occ.growth >= ALL_JOBS_GROWTH ? 'fu-up' : ''}>{res.occ.growth > 0 ? '+' : ''}{res.occ.growth}% jobs</span> · {fmtPay(res.occ.pay)}/yr · {fmtJobs(res.occ.jobs)} jobs</small></div>
        <span className={`jc-out jc-${res.outlook === 'High risk' ? 'hi' : res.outlook === 'Mixed' ? 'mid' : 'lo'}`} data-testid="text-job-outlook">{res.outlook}</span></div>
      {matches.length > 1 && <p className="jc-alt">Not quite right? {matches.map((k, i) => i === Math.min(pick, matches.length - 1) ? null : <button key={k} type="button" className="jc-chip" onClick={() => setPick(i)}>{occName(k)}</button>)}</p>}
      <div className="jc-rows">{rows.map(it => <div key={it.id} className="jc-row" data-testid={`job-item-${it.id}`}>
        <div className="jc-name"><b>{it.name}</b><span className={`ai-tag ${it.kind === 'Threat' ? 'ai-tag-t' : 'ai-tag-u'}`}>{it.kind === 'Threat' ? 'Threat' : 'Uncertain'}</span>
          <small>{res.why[it.id]} <span className="jc-when">{it.when}</span></small>{it.range && <small className="jc-range">{it.range[0]} → {it.range[1]}</small>}</div>
        <div className="jc-eff"><span>Jobs <Arrows a={res.byItem[it.id].jobs} label={`${it.name}, jobs`} /></span><span>Pay <Arrows a={res.byItem[it.id].pay} label={`${it.name}, pay`} /></span></div>
      </div>)}</div>
      <p className="jc-tip"><b>To stay ahead:</b> {res.tip}</p>
      {res.occ.aiNote && <p className="jc-tip"><b>BLS on AI:</b> {res.occ.aiNote.replace(/^BLS: /, '')}</p>}
    </div>}
  </div>;
}
