import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { api } from '@/lib/org-api';
import './support-chat.css';

// Floating help chat, bottom-right on every page. Answers come from POST /api/support/chat (Claude when the server has an
// ANTHROPIC_API_KEY, built-in answers otherwise). Only the typed messages, the page name and the language are sent: no profile,
// CV, skills or company data. The conversation lives in memory only and is gone on reload.
type Lang = 'EN' | 'BM' | '中文';
type Source = { title: string; url: string };
type Msg = { role: 'user' | 'assistant'; content: string; error?: boolean; sources?: Source[] };

const UI: Record<Lang, Record<string, string>> = {
  EN: { help: 'Help', title: 'Nexora assistant', sub: 'Ask me anything', hello: 'Hi! Ask me anything. If something is not working in Nexora, tell me what went wrong and I will help you step by step.', ph: 'Describe your issue…', send: 'Send', close: 'Close help', open: 'Open help chat', note: 'AI assistant. It can make mistakes and cannot see your account. Never share passwords.', faq: 'Quick answers only: the AI assistant is not connected on this site.', fail: 'Sorry, I could not reach the help service. Please try again in a moment.', thinking: 'Thinking…', src: 'Sources', s1: 'I can’t sign in', s2: 'How do I join a company?', s3: 'How do I register a company?', s4: 'My changes are not saving' },
  BM: { help: 'Bantuan', title: 'Pembantu Nexora', sub: 'Tanya apa sahaja', hello: 'Hai! Tanya saya apa sahaja. Jika sesuatu tidak berfungsi dalam Nexora, beritahu saya apa yang tidak kena dan saya akan bantu langkah demi langkah.', ph: 'Terangkan masalah anda…', send: 'Hantar', close: 'Tutup bantuan', open: 'Buka sembang bantuan', note: 'Pembantu AI. Ia boleh tersilap dan tidak dapat melihat akaun anda. Jangan kongsi kata laluan.', faq: 'Jawapan pantas (pembantu AI tidak disambungkan di laman ini).', fail: 'Maaf, perkhidmatan bantuan tidak dapat dihubungi. Sila cuba sebentar lagi.', thinking: 'Sedang berfikir…', src: 'Sumber', s1: 'Saya tidak boleh log masuk', s2: 'Bagaimana menyertai syarikat?', s3: 'Bagaimana mendaftar syarikat?', s4: 'Perubahan saya tidak disimpan' },
  中文: { help: '帮助', title: 'Nexora 助手', sub: '有问题尽管问我', hello: '您好！有问题尽管问我。如果 Nexora 中有哪里不能用，请告诉我出了什么问题，我会一步一步帮您。', ph: '请描述您遇到的问题…', send: '发送', close: '关闭帮助', open: '打开帮助聊天', note: 'AI 助手可能出错，且无法查看您的账户。请勿分享密码。', faq: '快速解答（此网站未连接 AI 助手）。', fail: '抱歉，无法连接到帮助服务，请稍后再试。', thinking: '思考中…', src: '来源', s1: '我无法登录', s2: '如何加入公司？', s3: '如何注册公司？', s4: '我的修改没有保存' },
};

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
// The administrator workspace and the personal workspace each remember their own language choice.
function currentLang(): Lang {
  const admin = !!document.querySelector('[data-testid=admin-shell]');
  const raw = admin ? read('nexora-admin-language') : read('aiversecity-language');
  const v = raw?.replace(/^"|"$/g, '');
  return v === 'BM' || v === '中文' ? v : 'EN';
}
function context() {
  const admin = !!document.querySelector('[data-testid=admin-shell]');
  const signedIn = admin || !!document.querySelector('.app-shell');
  const active = document.querySelector('.nav-item.active')?.textContent?.trim();
  return { account: admin ? 'admin' as const : signedIn ? 'personal' as const : 'visitor' as const, page: (active || window.location.pathname || '/').slice(0, 60) };
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [faq, setFaq] = useState(false);
  const [lang, setLang] = useState<Lang>('EN');
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const t = UI[lang];

  // Language is chosen elsewhere in the app; keep the widget in step with it.
  useEffect(() => { setLang(currentLang()); const id = window.setInterval(() => setLang(currentLang()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [msgs, busy, open]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  // Other parts of the app (for example the error screen) can open the chat with a ready question.
  useEffect(() => {
    const h = (e: Event) => { const m = (e as CustomEvent<{ message?: string }>).detail?.message; setOpen(true); if (m) void send(m); };
    window.addEventListener('nexora:help', h); return () => window.removeEventListener('nexora:help', h);
  });
  useEffect(() => { if (!open) return; const k = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open]);

  async function send(raw: string) {
    const content = raw.trim().slice(0, 1500);
    if (!content || busy) return;
    const next: Msg[] = [...msgs.filter(m => !m.error), { role: 'user', content }];
    setMsgs(next); setText(''); setBusy(true);
    try {
      let history = next.slice(-12).map(({ role, content: c }) => ({ role, content: c }));
      while (history[0]?.role === 'assistant') history = history.slice(1);
      const r = await api<{ reply: string; mode: 'ai' | 'faq'; sources?: Source[] }>('POST', '/support/chat', { messages: history, lang: currentLang(), ...context() });
      setFaq(r.mode === 'faq'); setMsgs(m => [...m, { role: 'assistant', content: r.reply, sources: (r.sources ?? []).filter(x => /^https?:\/\//i.test(x.url)).slice(0, 5) }]);
    } catch (e) {
      setMsgs(m => [...m, { role: 'assistant', content: e instanceof Error && e.message && !/fetch|network|json/i.test(e.message) ? e.message : t.fail, error: true }]);
    } finally { setBusy(false); }
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(text); } };

  return <div className="sc-root" data-testid="support-chat">
    {open && <section className="sc-panel" role="dialog" aria-label={t.title} data-testid="support-panel">
      <header className="sc-head"><span className="sc-avatar"><Bot size={17} /></span><div><b>{t.title}</b><small>{t.sub}</small></div>
        <button className="sc-x" onClick={() => setOpen(false)} aria-label={t.close} data-testid="button-support-close"><X size={16} /></button></header>
      <div className="sc-body" ref={box} aria-live="polite">
        <div className="sc-msg bot">{t.hello}</div>
        {!msgs.length && <div className="sc-chips">{[t.s1, t.s2, t.s3, t.s4].map(s => <button key={s} onClick={() => void send(s)} data-testid="chip-support">{s}</button>)}</div>}
        {msgs.map((m, i) => <div key={i} className={`sc-msg ${m.role === 'user' ? 'me' : 'bot'} ${m.error ? 'err' : ''}`} data-testid={m.role === 'user' ? 'msg-user' : 'msg-bot'}>{m.content}
          {!!m.sources?.length && <div className="sc-src" data-testid="support-sources">{t.src}: {m.sources.map((x, k) => <a key={k} href={x.url} target="_blank" rel="noopener noreferrer">{x.title}</a>)}</div>}</div>)}
        {busy && <div className="sc-msg bot sc-typing" data-testid="support-typing">{t.thinking}</div>}
        {faq && !!msgs.length && <div className="sc-faq">{t.faq}</div>}
      </div>
      <form className="sc-form" onSubmit={e => { e.preventDefault(); void send(text); }}>
        <textarea ref={input} value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey} placeholder={t.ph} rows={1} maxLength={1500} aria-label={t.ph} data-testid="input-support" />
        <button disabled={busy || !text.trim()} aria-label={t.send} title={t.send} data-testid="button-support-send"><Send size={16} /></button>
      </form>
      <p className="sc-note">{t.note}</p>
    </section>}
    {!open && <button className="sc-fab" onClick={() => setOpen(true)} aria-label={t.open} data-testid="button-support-open"><MessageCircle size={20} /><span>{t.help}</span></button>}
  </div>;
}
