import { useQuery } from '@tanstack/react-query';
import { api } from './org-api';

export type TeamMemberView = { id: string; name: string; currentRole: string; skills: string[]; goalRoleId: string | null; hasProfile: boolean; isOwner: boolean; joinedAt: string };
export type TeamInvite = { id: string; email: string; status: 'pending' | 'declined' | 'expired'; createdAt: string; expiresAt: string };
export type OwnedTeam = { id: string; name: string; targetRoleId: string | null; members: TeamMemberView[]; invitations: TeamInvite[] };
export type JoinedTeam = { id: string; name: string; targetRoleId: string | null; memberCount: number; ownerName: string; joinedAt?: string };
export type MyInvite = { id: string; teamName: string; inviterName: string; email: string; expiresAt: string };
export type TeamsOverview = { emailConfigured: boolean; myEmail: string; owned: OwnedTeam[]; joined: JoinedTeam[]; invitations: MyInvite[] };
export type InviteResult = { id: string; email: string; status: string; emailSent: boolean; link?: string; emailError?: string };
export type TokenInvite = { id: string; teamName: string; inviterName: string; email: string; status: string; forYou: boolean; yourEmail: string };

export const useTeams = () => useQuery<TeamsOverview>({ queryKey: ['teams'], queryFn: () => api<TeamsOverview>('GET', '/teams'), retry: 1, staleTime: 10_000, refetchInterval: 30_000 });
export const useInviteByToken = (token: string, enabled: boolean) => useQuery<TokenInvite>({ queryKey: ['teams', 'token', token], queryFn: () => api<TokenInvite>('GET', `/invitations/token/${encodeURIComponent(token)}`), enabled, retry: false });
