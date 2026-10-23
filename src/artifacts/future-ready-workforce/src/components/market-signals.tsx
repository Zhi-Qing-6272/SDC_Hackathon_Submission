import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import './discover.css';
import './market-signals.css';

type Snap = { fetchedAt: string; sourceUpdatedAt: string | null; sampleSize: number; totalPostings: number | null; stale?: boolean; attribution: string; attributionUrl: string;
  skills: { skill: string; count: number; share: number }[]; ai: { term: string; count: number; share: number }[]; topEmployers: { name: string; count: number }[] };
const nf = (n: number) => n.toLocaleString('en-US');
const pct = (x: number) => `${(x * 100).toFixed(x < 0.01 ? 2 : 1)}%`;

export function MarketSignals() {
  const [d, setD] = useState<Snap | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(true);
  const load = useCallback(async (refresh = false) => {
    setBusy(true); setErr('');
    try { const r = await fetch(`/api/market/himalayas${refresh ? '?refresh=1' : ''}`); const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'error'); setD(j); } catch (e) { setErr(e instanceof Error ? e.message : 'error'); }
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const max = Math.max(...(d?.skills.map(s => s.count) ?? [1]), 1);
  const msg: Record<string, string> = { upstream_auth: 'Himalayas rejected the API key. Check HIMALAYAS_API_KEY on the server (the key is optional; remove it to use the public allowance).', rate_limited: 'Himalayas’ rate limit was reached. Try again in a minute.', upstream_error: 'Himalayas could not be reached right now.' };

  return <>
    <div className="page-head"><div><div className="eyebrow">Evidence, with its limits</div><h1>What the market is signalling</h1>
      <p className="page-subtitle">Skill demand and AI mentions in the latest remote job postings from Himalayas. Counts are postings in a recent sample that mention a term, not forecasts.</p></div>
      <button className="quiet-button" onClick={() => load(true)} disabled={busy}><RefreshCw size={14} /> {busy ? 'Loading…' : 'Refresh'}</button></div>
    {err && !d && <section className="panel"><p className="dc-err" style={{ marginTop: 0 }}>{msg[err] ?? msg.upstream_error}</p></section>}
    {!d && !err && <section className="panel"><p className="dc-note" style={{ marginTop: 0 }}>Loading market data…</p></section>}
    {d && <>
      <div className="ms-stats"><div className="panel"><div className="eyebrow">SOURCE</div><b>Himalayas</b></div><div className="panel"><div className="eyebrow">POSTINGS IN THIS SAMPLE</div><b>{nf(d.sampleSize)}</b></div>
        <div className="panel"><div className="eyebrow">ALL LIVE ON HIMALAYAS</div><b>{d.totalPostings == null ? 'n/a' : nf(d.totalPostings)}</b></div><div className="panel"><div className="eyebrow">UPDATED</div><b>{new Date(d.fetchedAt).toLocaleString()}</b></div></div>
      {d.stale && <p className="dc-note">Showing the last saved snapshot because Himalayas could not be reached.</p>}

      <section className="panel section-gap"><div className="panel-head"><div><div className="eyebrow">Job-market demand</div><h2>Skills employers ask for</h2><p className="page-subtitle">Postings in the sample that mention each skill in their title, category or summary, and their share of the sample. One posting can mention several skills.</p></div></div>
        <div className="ms-bars">{d.skills.map(s => <div className="ms-row" key={s.skill}><span>{s.skill}</span><div className="ms-track"><i style={{ width: `${(s.count / max) * 100}%` }} /></div><b>{nf(s.count)} <small>{pct(s.share)}</small></b></div>)}</div></section>

      <section className="panel section-gap"><div className="panel-head"><div><div className="eyebrow">AI trends</div><h2>How much hiring mentions AI</h2><p className="page-subtitle">How many postings in the sample mention each AI-related term. This is a snapshot of one moment; compare it with a later refresh to see movement. It is not a prediction.</p></div></div>
        <div className="dc-list">{d.ai.map(a => <article className="dc-card" key={a.term}><div className="dc-top"><div><h3 style={{ textTransform: 'capitalize' }}>{a.term}</h3><p>{nf(a.count)} of {nf(d.sampleSize)} postings in the sample</p></div>
          <span className="dc-score">{pct(a.share)}</span></div></article>)}</div>
        {d.topEmployers.length > 0 && <><div className="eyebrow" style={{ marginTop: 18 }}>COMPANIES WITH THE MOST AI-RELATED POSTINGS</div><div className="skill-chips">{d.topEmployers.map(e => <span key={e.name} className="skill-chip">{e.name} · {e.count}</span>)}</div></>}</section>

      <p className="dc-note"><a href={d.attributionUrl} target="_blank" rel="noreferrer">{d.attribution}</a>. Himalayas lists remote roles worldwide, so this does not represent the Malaysian job market. Skills are matched from short text, so counts are indicative.</p>
    </>}
  </>;
}
