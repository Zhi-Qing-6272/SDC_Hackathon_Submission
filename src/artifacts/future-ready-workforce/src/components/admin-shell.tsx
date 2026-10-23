import { useEffect, useState } from 'react';
import { BarChart3, Building2, GraduationCap, LayoutDashboard, LogOut, ShieldCheck, UserCog, UserRound, Users } from 'lucide-react';
import { useOrgAdmin } from '@/lib/org-api';
import { AdminLang, LANGS, useT, type Lang } from '@/lib/admin-i18n';
import { ADMIN_TABS, AdminPage, type AdminTab } from './admin-pages';
import type { Account } from './org';

// What a company administrator sees after signing in: their own menu and pages. The personal pages
// (Discover, Market signals, Learning pathway, My profile, Team view) are not part of this workspace.
const ICONS: Record<AdminTab, typeof Users> = { overview: LayoutDashboard, gaps: BarChart3, teams: Users, training: GraduationCap, members: UserRound, company: Building2 };
const LANG_KEY = 'nexora-admin-language';
const readLang = (): Lang => { try { const v = localStorage.getItem(LANG_KEY); if (v === 'EN' || v === 'BM' || v === '中文') return v; } catch { /* storage blocked */ } return 'EN'; };

// The language choice applies to the administrator workspace only, and is remembered in this browser.
export function AdminShell({ account }: { account: Account }) {
  const [lang, setLang] = useState<Lang>(readLang);
  useEffect(() => { try { localStorage.setItem(LANG_KEY, lang); } catch { /* storage blocked */ } document.documentElement.lang = lang === 'BM' ? 'ms' : lang === '中文' ? 'zh-Hans' : 'en'; return () => { document.documentElement.lang = 'en'; }; }, [lang]);
  return <AdminLang.Provider value={lang}><Shell account={account} lang={lang} setLang={setLang} /></AdminLang.Provider>;
}

function Shell({ account, lang, setLang }: { account: Account; lang: Lang; setLang: (l: Lang) => void }) {
  const { t } = useT();
  const [tab, setTab] = useState<AdminTab>('overview');
  const admin = useOrgAdmin(true);
  const current = ADMIN_TABS.find(x => x.id === tab)!;
  return <div className="app-shell" data-testid="admin-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">N</div><div><div className="brand-name">Nexora</div><div className="brand-caption">{t('Company administration')}</div></div></div>
      <div className="nav-label">{admin.data?.org.name ?? t('Administration')}</div>
      {ADMIN_TABS.map(x => { const Icon = ICONS[x.id]; return <button key={x.id} className={`nav-item ${tab === x.id ? 'active' : ''}`} onClick={() => setTab(x.id)} data-testid={`tab-${x.id}`}><Icon size={17} />{t(x.label)}</button>; })}
      <div className="sidebar-bottom"><div className="privacy-note"><b><ShieldCheck size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />{t('Employee privacy')}</b>{t('Employees appear only if they choose to share. You never see interests, experience notes or CV text.')}</div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><span className="live-dot" /><span>{t('Company administration')} <span style={{ color: '#94A3B8' }}> / </span>{t(current.label)}</span></div>
        <div className="top-actions">
          <select className="og-select lang-select" value={lang} onChange={e => setLang(e.target.value as Lang)} aria-label="Language / Bahasa / 语言" title="Language / Bahasa / 语言" data-testid="select-language">{LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}</select>
          <span className="topbar-who" title={account.email}>{account.name || account.email}</span>
          <button className="icon-button" aria-label={t('Account and password')} title={t('Account & password')} onClick={account.onManage} data-testid="button-admin-account"><UserCog size={15} /></button>
          <button className="quiet-button" onClick={account.onSignOut} data-testid="button-admin-sign-out"><LogOut size={14} /> {t('Sign out')}</button></div>
      </header>
      <div className="content">
        {admin.isError ? <section className="panel"><p className="dc-err" style={{ marginTop: 0 }}>{t('The administrator dashboard could not be loaded.')}</p></section>
          : !admin.data ? <p className="dc-note">{t('Loading the administrator dashboard…')}</p>
          : <AdminPage data={admin.data} tab={tab} setTab={setTab} account={account} />}
      </div>
    </main>
    <nav className="mobile-nav" aria-label={t('Administrator menu')}>{ADMIN_TABS.map(x => { const Icon = ICONS[x.id]; return <button key={x.id} className={tab === x.id ? 'active' : ''} onClick={() => setTab(x.id)} data-testid={`mobile-tab-${x.id}`}><Icon /><span>{t(x.label)}</span></button>; })}</nav>
  </div>;
}
