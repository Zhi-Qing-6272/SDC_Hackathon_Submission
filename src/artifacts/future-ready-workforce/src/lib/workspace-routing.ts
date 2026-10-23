export type WorkspaceMode = 'personal' | 'company' | null;
export type LandingView = 'org' | 'team' | 'overview' | 'profile';

export function parseWorkspaceMode(value: string | null): WorkspaceMode {
  return value === 'personal' || value === 'company' ? value : null;
}

export function requiresSignOutForCompanyRegistration(isSignedIn: boolean): boolean {
  return isSignedIn;
}

export function workspaceModeFromSearch(search: string): WorkspaceMode {
  const params = new URLSearchParams(search);
  const explicit = parseWorkspaceMode(params.get('mode'));
  if (explicit) return explicit;
  return params.get('as') === 'admin' || params.get('view') === 'company' ? 'company' : null;
}

export function workspaceRedirectPath(basePath: string, mode: Exclude<WorkspaceMode, null>, registeringCompany = false): string {
  const base = basePath.replace(/\/$/, '');
  return mode === 'company'
    ? `${base}/workspace?mode=company&view=company${registeringCompany ? '&intent=register-company' : ''}`
    : `${base}/workspace?mode=personal`;
}

export function companyEntryState(input: {
  loading: boolean; failed: boolean; role?: string; hasCompany: boolean;
  registrationIntent: boolean; hasPendingRegistration: boolean; canRegister: boolean;
}): 'loading' | 'error' | 'admin' | 'registration' | 'denied' {
  if (input.loading) return 'loading';
  if (input.failed) return 'error';
  if (input.role === 'admin' && input.hasCompany) return 'admin';
  if (!input.hasCompany && input.canRegister && input.registrationIntent && input.hasPendingRegistration) return 'registration';
  return 'denied';
}

export function passwordRecoveryRedirectPath(basePath: string, company: boolean): string {
  return workspaceRedirectPath(basePath, company ? 'company' : 'personal');
}

export function initialWorkspaceView(mode: WorkspaceMode, requestedView: string | null, hasProfile: boolean): LandingView {
  if (requestedView === 'company') return 'org';
  if (requestedView === 'team') return 'team';
  if (mode === 'company') return 'org';
  return hasProfile ? 'overview' : 'profile';
}

export function viewAfterWorkspaceModeChange(mode: WorkspaceMode, hasProfile: boolean): LandingView | null {
  if (mode === 'company') return 'org';
  if (mode === 'personal') return hasProfile ? 'overview' : 'profile';
  return null;
}

export function shouldShowAdminWorkspace(role: string | null | undefined, mode: WorkspaceMode): boolean {
  return role === 'admin' && mode !== 'personal';
}
