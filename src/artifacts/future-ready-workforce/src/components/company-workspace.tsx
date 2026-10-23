import { useState, type ReactNode } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { AdminShell } from './admin-shell';
import { PendingCompanyRegistration, type Account } from './org';
import { loadPending } from './company-form';
import { useOrgMe } from '@/lib/org-api';
import { companyEntryState } from '@/lib/workspace-routing';

// Company sign-in has its own entry point. A missing/failed membership lookup must never
// fall through to the learner dashboard, employee tools, or automatic company registration.
export function CompanyWorkspace({ registrationIntent }: { registrationIntent: boolean }) {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const membership = useOrgMe();
  const [pending] = useState(() => registrationIntent ? loadPending() : null);
  const account: Account = {
    name: user?.fullName ?? user?.firstName ?? '',
    email: user?.primaryEmailAddress?.emailAddress ?? '',
    onSignOut: () => { void signOut({ redirectUrl: import.meta.env.BASE_URL }); },
    onManage: () => openUserProfile(),
  };
  const state = companyEntryState({
    loading: !user || membership.isLoading,
    failed: membership.isError,
    role: membership.data?.role,
    hasCompany: !!membership.data?.org,
    registrationIntent,
    hasPendingRegistration: !!pending,
    canRegister: !!membership.data?.canRegister,
  });
  if (state === 'admin') return <AdminShell account={account} />;
  return <CompanyAccessFrame account={account}>
    {state === 'loading' ? <p role="status" data-testid="company-access-loading">Checking your company administrator access…</p>
      : state === 'registration' && pending ? <PendingCompanyRegistration account={account} pending={pending} />
      : <section className="panel" role="alert" data-testid="company-access-error">
        <div className="eyebrow">Company administrator sign in</div>
        <h1>{state === 'error' ? 'Unable to verify administrator access' : 'Administrator access is not linked to this account'}</h1>
        <p>You are signed in as <b>{account.email || account.name}</b>.</p>
        <p>{state === 'error'
          ? 'We could not check your company membership. Your company data has not been changed. Try again.'
          : membership.data?.role === 'member'
            ? 'This account is a company member, not an administrator. Company sign in does not change your permissions.'
            : 'No company administrator membership was found for this signed-in account. If you already registered your company, its administrator link needs to be checked. Do not register it again.'}</p>
        <p>You have not been switched to the personal workspace.</p>
        <div className="og-actions">
          <button className="primary-button" disabled={membership.isFetching} onClick={() => void membership.refetch()} data-testid="button-retry-company-access">{membership.isFetching ? 'Checking…' : 'Check access again'}</button>
          <button className="outline-button" onClick={account.onSignOut} data-testid="button-company-access-sign-out">Sign out</button>
        </div>
      </section>}
  </CompanyAccessFrame>;
}

function CompanyAccessFrame({ account, children }: { account: Account; children: ReactNode }) {
  return <div className="app-shell" data-testid="company-access-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">N</div><div><div className="brand-name">Nexora</div><div className="brand-caption">Company administration</div></div></div>
      <div className="nav-label">Administrator access</div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-left">Company administration</div><div className="top-actions"><button className="quiet-button" onClick={account.onSignOut}>Sign out</button></div></header>
      <div className="content">{children}</div>
    </main>
  </div>;
}
