import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initialWorkspaceView,
  companyEntryState,
  passwordRecoveryRedirectPath,
  parseWorkspaceMode,
  shouldShowAdminWorkspace,
  requiresSignOutForCompanyRegistration,
  viewAfterWorkspaceModeChange,
  workspaceRedirectPath,
  workspaceModeFromSearch,
} from '../src/lib/workspace-routing.ts';

test('personal and company sign-in redirects point to their selected workspace', () => {
  assert.equal(workspaceRedirectPath('', 'personal'), '/workspace?mode=personal');
  assert.equal(workspaceRedirectPath('', 'company'), '/workspace?mode=company&view=company');
  assert.equal(workspaceRedirectPath('/nexora/', 'personal'), '/nexora/workspace?mode=personal');
  assert.equal(workspaceRedirectPath('/nexora/', 'company'), '/nexora/workspace?mode=company&view=company');
});

test('unknown or missing mode does not create an account role', () => {
  assert.equal(parseWorkspaceMode(null), null);
  assert.equal(parseWorkspaceMode('administrator'), null);
  assert.equal(parseWorkspaceMode('personal'), 'personal');
  assert.equal(parseWorkspaceMode('company'), 'company');
  assert.equal(shouldShowAdminWorkspace('member', 'company'), false);
  assert.equal(shouldShowAdminWorkspace(null, 'company'), false);
  assert.equal(shouldShowAdminWorkspace('admin', 'personal'), false);
  assert.equal(shouldShowAdminWorkspace('admin', 'company'), true);
});

test('company mode opens the company view and personal mode opens the personal view', () => {
  assert.equal(initialWorkspaceView('company', null, true), 'org');
  assert.equal(initialWorkspaceView('personal', null, true), 'overview');
  assert.equal(initialWorkspaceView('personal', null, false), 'profile');
  assert.equal(initialWorkspaceView('company', 'team', true), 'team');
  assert.equal(viewAfterWorkspaceModeChange('company', true), 'org');
  assert.equal(viewAfterWorkspaceModeChange('personal', true), 'overview');
  assert.equal(viewAfterWorkspaceModeChange('personal', false), 'profile');
});

test('password recovery reuses the same selected-workspace redirect as sign-in', () => {
  assert.equal(passwordRecoveryRedirectPath('/nexora', false), workspaceRedirectPath('/nexora', 'personal'));
  assert.equal(passwordRecoveryRedirectPath('/nexora', true), workspaceRedirectPath('/nexora', 'company'));
});

test('company routes, including legacy administrator links, cannot select the personal entry point', () => {
  assert.equal(workspaceModeFromSearch('?mode=company&view=company'), 'company');
  assert.equal(workspaceModeFromSearch('?as=admin'), 'company');
  assert.equal(workspaceModeFromSearch('?view=company'), 'company');
  assert.equal(workspaceModeFromSearch('?mode=personal&view=company'), 'personal');
  assert.equal(workspaceModeFromSearch(''), null);
});

const entry = {
  loading: false, failed: false, hasCompany: false, role: undefined,
  registrationIntent: false, hasPendingRegistration: false, canRegister: true,
};

test('company entry opens the administrator pages only for a confirmed company administrator', () => {
  assert.equal(companyEntryState({ ...entry, role: 'admin', hasCompany: true }), 'admin');
  assert.equal(companyEntryState({ ...entry, role: 'admin', hasCompany: false }), 'denied');
  assert.equal(companyEntryState({ ...entry, role: 'member', hasCompany: true }), 'denied');
  assert.equal(companyEntryState(entry), 'denied');
});

test('loading and failed company membership checks do not fall back to learner or registration pages', () => {
  assert.equal(companyEntryState({ ...entry, loading: true }), 'loading');
  assert.equal(companyEntryState({ ...entry, failed: true }), 'error');
  assert.equal(companyEntryState({ ...entry, failed: true, role: 'admin', hasCompany: true }), 'error');
});

test('ordinary company sign-in cannot submit a stale registration draft', () => {
  assert.equal(companyEntryState({ ...entry, hasPendingRegistration: true }), 'denied');
  assert.equal(companyEntryState({ ...entry, registrationIntent: true }), 'denied');
  assert.equal(companyEntryState({ ...entry, registrationIntent: true, hasPendingRegistration: true }), 'registration');
  assert.equal(companyEntryState({ ...entry, registrationIntent: true, hasPendingRegistration: true, canRegister: false }), 'denied');
  assert.equal(companyEntryState({ ...entry, registrationIntent: true, hasPendingRegistration: true, hasCompany: true, role: 'member' }), 'denied');
  assert.equal(workspaceRedirectPath('', 'company', true), '/workspace?mode=company&view=company&intent=register-company');
  assert.equal(workspaceRedirectPath('', 'personal', true), '/workspace?mode=personal');
});

test('company registration requires the user to be signed out first', () => {
  assert.equal(requiresSignOutForCompanyRegistration(true), true);
  assert.equal(requiresSignOutForCompanyRegistration(false), false);
});
