import { useState } from 'react';
import { Link, useSearch } from 'wouter';
import { SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { ForgotPassword } from './forgot-password';
import { ArrowRight, BookOpen, Compass, Languages, Lock, Radio, Users } from 'lucide-react';
import { CompanyForm, loadPending, savePending, type CompanyPayload } from './company-form';
import { requiresSignOutForCompanyRegistration, workspaceRedirectPath } from '@/lib/workspace-routing';
import './account-pages.css';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const logoSrc = `${basePath}/logo.svg`;

function Brand({ testId }: { testId: string }) {
  return (
    <Link href="/" className="pl-brand" data-testid={testId}>
      <img src={logoSrc} alt="" />
      <span><b>Nexora</b><small>Future workforce</small></span>
    </Link>
  );
}

const features = [
  { icon: Lock, title: 'A private account', body: 'Sign in to keep your skills, interests and learning progress saved to your own account rather than one browser.', cls: 'wide' },
  { icon: Radio, title: 'Live public job signals', body: 'Job categories and keywords from the Himalayas remote-jobs API, shown with the date they were fetched and the size of the sample.', cls: 'wide accent' },
  { icon: Compass, title: 'Transparent role matching', body: 'Fit scores combine skill overlap, interests and relative signal share. The weights are shown on every card.', cls: '' },
  { icon: BookOpen, title: 'Learning pathways', body: 'Short sequences linked to provider catalogues and open resources. Mark steps complete as you go.', cls: '' },
  { icon: Users, title: 'Optional team planning', body: 'Plan shared learning for a team you set up in your own account. Not a ranking, not a hiring tool.', cls: '' },
];

export function PublicLanding() {
  return (
    <div className="pl">
      <header className="pl-nav">
        <Brand testId="link-home" />
        <nav className="pl-actions">
          <Link href="/sign-in" className="pl-btn ghost" data-testid="link-sign-in">Sign in</Link>
          <Link href="/company-sign-in" className="pl-btn ghost" data-testid="link-company-sign-in">Company sign in</Link>
          <Link href="/register-company" className="pl-btn ghost" data-testid="link-register-company">Register your company</Link>
          <Link href="/sign-up" className="pl-btn solid" data-testid="link-sign-up">Create account</Link>
        </nav>
      </header>

      <main className="pl-wrap">
        <section className="pl-hero">
          <div>
            <div className="pl-eyebrow">Career planning with dated evidence</div>
            <h1>Carry what you already do well into <em>changing work.</em></h1>
            <p>Record the skills and interests that are true for you, compare adjacent roles against a dated sample of public job postings, and build a small learning plan you control. Evidence, with its limits stated.</p>
            <div className="pl-cta">
              <Link href="/sign-up" className="pl-btn solid" data-testid="link-hero-sign-up">Start your workspace <ArrowRight size={16} /></Link>
              <Link href="/sign-in" className="pl-btn ghost" data-testid="link-hero-sign-in">I have an account</Link>
              <Link href="/register-company" className="pl-btn ghost" data-testid="link-hero-register-company">I manage a company</Link>
            </div>
          </div>
          <aside className="pl-compass">
            <div className="k">How it works</div>
            <h3>Three steps, each one yours to change.</h3>
            <div className="pl-step"><span>01</span>Save the skills and interests you want to use.</div>
            <div className="pl-step"><span>02</span>See role fit against today's public signal snapshot.</div>
            <div className="pl-step"><span>03</span>Pick a pathway and track the steps you complete.</div>
          </aside>
        </section>

        <section className="pl-section">
          <div className="pl-eyebrow">What the workspace does</div>
          <h2>Built for informed choices.</h2>
          <p className="pl-lead">Every feature below is part of the signed-in workspace. Suggestions support your judgment; they never decide for you.</p>
          <div className="pl-features">
            {features.map((f, i) => (
              <article key={f.title} className={`pl-feature ${f.cls}`} style={{ animationDelay: `${i * 70}ms` }} data-testid={`card-feature-${i}`}>
                <f.icon />
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pl-section">
          <div className="pl-eyebrow">Three languages</div>
          <h2>Use the workspace in English, Bahasa Melayu or Chinese.</h2>
          <p className="pl-lead">Switch language at any time inside the workspace. <Languages size={14} style={{ verticalAlign: '-2px' }} /></p>
          <div className="pl-langs"><span>EN</span><span>BM</span><span>中文</span></div>
        </section>

        <section className="pl-section">
          <div className="pl-eyebrow">Privacy and sources</div>
          <h2>What we can and cannot tell you.</h2>
          <div className="pl-caveats">
            <div className="pl-caveat"><strong>Source limits</strong>Signals come from the <a href="https://himalayas.app" target="_blank" rel="noreferrer" data-testid="link-himalayas">Himalayas</a> public API: a global sample of remote postings. It does not represent all Malaysian employment, and counts come from posting categories and keywords, not forecasts.</div>
            <div className="pl-caveat"><strong>No guarantees</strong>Role fit and pathways are planning aids. They do not predict hiring outcomes or promise employment.</div>
            <div className="pl-caveat"><strong>What is used for matching</strong>Only the skills and interests you enter plus public skill-tag share. Age, gender, ethnicity and background are never used.</div>
            <div className="pl-caveat"><strong>Your data</strong>Profile and progress are stored against your account. A preferred name is enough; avoid sensitive document details. Only add team information you have permission to manage.</div>
          </div>
        </section>

        <section className="pl-final">
          <div><h2>Start with what is true for you.</h2><p>Free to create an account. Edit or remove your details whenever your goals change.</p></div>
          <Link href="/sign-up" className="pl-btn gold" data-testid="link-final-sign-up">Create account <ArrowRight size={16} /></Link>
        </section>

        <footer className="pl-foot">
          <span>Nexora</span>
          <span>Job signals: <a href="https://himalayas.app/docs/remote-jobs-api" target="_blank" rel="noreferrer" data-testid="link-himalayas-api">Himalayas API</a></span>
        </footer>
      </main>
    </div>
  );
}

export function AccountPage({ mode, company = false, admin = false }: { mode: 'sign-in' | 'sign-up' | 'forgot'; company?: boolean; admin?: boolean }) {
  const search = useSearch();
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const continuingRegistration = new URLSearchParams(search || window.location.search).get('intent') === 'register-company' && !!loadPending();
  const forgot = mode === 'forgot';
  const isIn = mode === 'sign-in' || forgot;
  // "Register a company" is one page in two steps: 1) company details, 2) create or use the administrator's Nexora sign-in.
  // The details stay in this tab and are sent to the server once that identity is authenticated.
  const [details, setDetails] = useState<CompanyPayload | null>(() => (company ? loadPending() : null));
  const step1 = !isIn && company && !details;
  if (company && !isIn && isLoaded && requiresSignOutForCompanyRegistration(!!isSignedIn)) return (
    <div className="acct" data-testid="notice-signed-in-company-registration">
      <aside className="acct-side"><Brand testId="link-account-home" /><h1>Sign out before company registration.</h1><p>To register a company, sign out first. Then finish registration and sign in through Company sign in to open the administrator workspace.</p></aside>
      <main className="acct-main"><section className="panel">
        <div className="eyebrow">Company registration</div><h2>Sign out to continue</h2>
        <p className="og-note">Your personal account cannot register a company from its signed-in workspace. Your saved company details will remain in this browser tab.</p>
        <button className="primary-button" onClick={() => void signOut({ redirectUrl: `${basePath}/register-company` })} data-testid="button-sign-out-to-register-company">Sign out and continue</button>
      </section></main>
    </div>
  );
  // One Clerk identity can use the personal workspace and, after registering a company, its administrator workspace.
  const tabs = isIn
    ? [{ href: '/sign-in', label: 'Personal sign in', on: !admin, id: 'tab-personal-sign-in' }, { href: '/company-sign-in', label: 'Company sign in', on: admin, id: 'tab-company-sign-in' }]
    : [{ href: '/sign-up', label: 'Create personal account', on: !company, id: 'tab-personal-sign-up' }, { href: '/register-company', label: 'Register a company', on: company, id: 'tab-register-company' }];
  if (company && !isIn && !isLoaded) return (
    <div className="acct" data-testid="status-company-registration-auth">
      <aside className="acct-side"><Brand testId="link-account-home" /><h1>Checking your sign-in.</h1><p>Company registration is available after signing out.</p></aside>
      <main className="acct-main"><section className="panel"><p role="status">Checking your account…</p></section></main>
    </div>
  );
  return (
    <div className={`acct${step1 ? ' acct-wide' : ''}`}>
      <aside className="acct-side">
        <Brand testId="link-account-home" />
        <h1>{forgot ? 'Reset your password.' : admin ? 'Company administrator sign in.' : isIn ? 'Welcome back to your workspace.' : company ? 'Register your company.' : 'A private place to plan your next step.'}</h1>
        <p>{admin ? 'Use the same email and password as your Personal sign in. If this account has registered a company, you will open its administrator workspace.' : company ? (step1 ? 'Step 1 of 2: enter your company registration number, business licence number, address and contact details. Step 2: create or use your Nexora sign-in.' : 'Use your existing Nexora sign-in or create one. The same email and password can open your personal workspace and your company administrator workspace.') : isIn ? 'Sign in to see your matches, your learning pathway and your teams.' : 'Create a personal account to build your skills profile, plan learning, and join your company with the join code your administrator gives you.'}</p>
        <div className="note">Matching uses only your skills, interests and the categories and keywords of public Himalayas job postings. No hiring decisions, no guaranteed outcomes. <Link href="/" data-testid="link-learn-more">Read what the workspace does</Link></div>
      </aside>
      <main className="acct-main">
        <div>
          <Link href="/" className="back" data-testid="link-back">Back to overview</Link>
          <div className="acct-tabs" role="tablist" data-testid="acct-tabs">{tabs.map(t => <Link key={t.id} href={t.href} role="tab" aria-selected={t.on} className={t.on ? 'on' : ''} data-testid={t.id}>{t.label}</Link>)}</div>
          <p className="acct-alt" data-testid="text-acct-hint">{forgot ? 'We email a verification code to the address on the account, then you choose a new password.' : isIn
             ? (admin ? 'For company administrators. Use the same sign-in form as Personal sign in; this tab opens the company workspace.' : 'For employees and learners. You can join a company with its join code.')
            : (company ? 'Fill in the company details, then use or create one Nexora sign-in. That same account can access both workspaces.' : 'Employees and learners start here. You can use the same Nexora sign-in for personal and company workspaces.')}</p>
          {step1 ? (
            <div data-testid="step-company-details">
              <h2 className="acct-step">Step 1 of 2 · Company details</h2>
              <CompanyForm submitLabel="Continue" submitTestId="button-company-continue" onSubmit={p => { savePending(p); setDetails(p); }} />
            </div>
          ) : forgot ? (
            <ForgotPassword company={admin} />
          ) : isIn ? (
            <>
              {admin
                ? <SignIn routing="path" path={`${basePath}/company-sign-in`} signUpUrl={`${basePath}/register-company`} forceRedirectUrl={workspaceRedirectPath(basePath, 'company', continuingRegistration)} />
                : <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} forceRedirectUrl={workspaceRedirectPath(basePath, 'personal')} />}
            </>
          ) : company && details ? (
            <div data-testid="step-company-account">
              <h2 className="acct-step">Step 2 of 2 · Use your Nexora sign-in</h2>
              <p className="acct-saved" data-testid="text-company-saved"><b>{details.name}</b> · Reg. no. {details.registrationNumber} <button type="button" className="quiet-button" onClick={() => setDetails(null)} data-testid="button-edit-company">Edit details</button></p>
              <p className="acct-alt" data-testid="text-shared-account-help">Already have a Nexora account? Choose Sign in in the form. This same login works in Personal sign in and Company sign in.</p>
              <SignUp routing="path" path={`${basePath}/register-company`} signInUrl={`${basePath}/company-sign-in?intent=register-company`} initialValues={{ emailAddress: details.contactEmail, firstName: details.contactName.split(' ')[0], lastName: details.contactName.split(' ').slice(1).join(' ') }} forceRedirectUrl={workspaceRedirectPath(basePath, 'company', true)} />
            </div>
          ) : (
            <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} forceRedirectUrl={workspaceRedirectPath(basePath, 'personal')} />
          )}
        </div>
      </main>
    </div>
  );
}
