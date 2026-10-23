import { useState, type FormEvent } from 'react';
import { Building2 } from 'lucide-react';
import './discover.css';
import './org.css';

// The company registration form. It is used before sign-in on the registration page and inside the workspace for an
// authenticated account that has not registered or joined a company yet.
export const INDUSTRIES = ['Technology', 'Manufacturing', 'Retail & e-commerce', 'Healthcare', 'Education & training', 'Finance & insurance', 'Logistics & transport', 'Energy & utilities', 'Construction & property', 'Hospitality & tourism', 'Agriculture & food', 'Public sector & non-profit', 'Professional services', 'Other'];
export const SIZES = ['1-10', '11-50', '51-200', '201-500', '501+'];
export const EMPTY = { name: '', registrationNumber: '', licenseNumber: '', industry: '', companySize: '', addressLine: '', city: '', state: '', postcode: '', country: 'Malaysia', website: '', contactName: '', contactEmail: '', contactPhone: '' };

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="og-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}


export type CompanyPayload = typeof EMPTY & { authorised: boolean; acceptedTerms: boolean };
const KEY = 'nexora-pending-company';
// Held only in this browser tab until the Nexora identity is authenticated, then sent to the server once.
export const savePending = (p: CompanyPayload) => { try { sessionStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ } };
export const loadPending = (): CompanyPayload | null => { try { const v = JSON.parse(sessionStorage.getItem(KEY) ?? 'null'); return v && typeof v === 'object' && v.name ? { ...EMPTY, authorised: false, acceptedTerms: false, ...v } : null; } catch { return null; } };
export const clearPending = () => { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } };

export function CompanyForm({ initial, busy = false, error = '', submitLabel, submitTestId, onSubmit, onBack, backLabel = 'Back' }: {
  initial?: Partial<CompanyPayload>; busy?: boolean; error?: string; submitLabel: string; submitTestId: string; onSubmit: (p: CompanyPayload) => void; onBack?: () => void; backLabel?: string;
}) {
  const [f, setF] = useState({ ...EMPTY, ...initial } as typeof EMPTY);
  const [authorised, setAuthorised] = useState(!!initial?.authorised); const [terms, setTerms] = useState(!!initial?.acceptedTerms);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF(v => ({ ...v, [k]: e.target.value }));
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit({ ...f, authorised, acceptedTerms: terms }); };
  const ready = f.name.trim() && f.registrationNumber.trim() && f.licenseNumber.trim() && f.industry && f.companySize && f.addressLine.trim() && f.city.trim() && f.state.trim() && f.postcode.trim() && f.country.trim() && f.contactName.trim() && f.contactEmail.trim() && f.contactPhone.trim() && authorised && terms;
  return <form onSubmit={submit} data-testid="form-register-company">
      <section className="panel"><div className="eyebrow">Legal details</div><h2>Company</h2>
        <div className="og-form">
          <Field label="Registered company name *"><input className="dc-input" value={f.name} onChange={set('name')} maxLength={150} autoComplete="organization" data-testid="input-company-name" /></Field>
          <Field label="Company registration number *" hint="As on your registry certificate, e.g. 202001012345 or 123456-X. Each number can be registered once."><input className="dc-input" value={f.registrationNumber} onChange={set('registrationNumber')} maxLength={30} data-testid="input-registration-number" /></Field>
          <Field label="Business licence number *" hint="Your trading or business licence number."><input className="dc-input" value={f.licenseNumber} onChange={set('licenseNumber')} maxLength={40} data-testid="input-license-number" /></Field>
          <Field label="Industry *"><select className="og-select" value={f.industry} onChange={set('industry')} data-testid="select-industry"><option value="">Select industry</option>{INDUSTRIES.map(i => <option key={i}>{i}</option>)}</select></Field>
          <Field label="Number of employees *"><select className="og-select" value={f.companySize} onChange={set('companySize')} data-testid="select-size"><option value="">Select size</option>{SIZES.map(i => <option key={i}>{i}</option>)}</select></Field>
          <Field label="Website"><input className="dc-input" value={f.website} onChange={set('website')} maxLength={200} placeholder="example.com" inputMode="url" /></Field>
        </div></section>
      <section className="panel section-gap"><div className="eyebrow">Registered address</div><h2>Address</h2>
        <div className="og-form">
          <Field label="Address *"><input className="dc-input" value={f.addressLine} onChange={set('addressLine')} maxLength={200} autoComplete="street-address" data-testid="input-address" /></Field>
          <Field label="City *"><input className="dc-input" value={f.city} onChange={set('city')} maxLength={100} autoComplete="address-level2" /></Field>
          <Field label="State / region *"><input className="dc-input" value={f.state} onChange={set('state')} maxLength={100} autoComplete="address-level1" /></Field>
          <Field label="Postcode *"><input className="dc-input" value={f.postcode} onChange={set('postcode')} maxLength={12} autoComplete="postal-code" /></Field>
          <Field label="Country *"><input className="dc-input" value={f.country} onChange={set('country')} maxLength={60} autoComplete="country-name" /></Field>
        </div></section>
      <section className="panel section-gap"><div className="eyebrow">Administrator contact</div><h2>Who is responsible for this account?</h2>
        <div className="og-form">
          <Field label="Full name *"><input className="dc-input" value={f.contactName} onChange={set('contactName')} maxLength={100} autoComplete="name" data-testid="input-contact-name" /></Field>
          <Field label="Work email *"><input className="dc-input" type="email" value={f.contactEmail} onChange={set('contactEmail')} maxLength={200} autoComplete="email" data-testid="input-contact-email" /></Field>
          <Field label="Phone *"><input className="dc-input" type="tel" value={f.contactPhone} onChange={set('contactPhone')} maxLength={20} placeholder="+60 12-345 6789" autoComplete="tel" data-testid="input-contact-phone" /></Field>
        </div></section>
      <section className="og-consent section-gap">
        <label className="og-check"><input type="checkbox" checked={authorised} onChange={e => setAuthorised(e.target.checked)} data-testid="checkbox-authorised" /><span>I confirm that I am authorised to register this company and that the details above are accurate.</span></label>
        <label className="og-check"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} data-testid="checkbox-terms" /><span>I will use employees’ shared skills data only to plan training, never for hiring, firing or pay decisions, and I will handle it in line with the data-protection law that applies to my company (for example Malaysia’s PDPA).</span></label>
        <p className="og-note" style={{ margin: 0 }}>Registration and licence numbers are checked for format and uniqueness only. They are not verified against an official registry.</p>
      </section>
      {error && <p className="dc-err" role="alert" data-testid="text-register-error">{error}</p>}
      <div className="og-actions">{onBack && <button type="button" className="quiet-button" onClick={onBack}>{backLabel}</button>}<button className="primary-button" disabled={busy || !ready} data-testid={submitTestId}><Building2 size={14} /> {submitLabel}</button></div>
  </form>;
}
