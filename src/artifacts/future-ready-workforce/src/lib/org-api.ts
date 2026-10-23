import { useQuery } from '@tanstack/react-query';

export type OrgTeam = { id: string; name: string; requiredSkills: string[]; synthetic?: boolean };
export type Assignment = { id: string; skill: string; note: string; hours: number; teamId: string | null };
export type CompanyDetails = { name: string; registrationNumber: string; licenseNumber: string; industry: string; companySize: string; addressLine: string; city: string; state: string; postcode: string; country: string; website: string; contactName: string; contactEmail: string; contactPhone: string };
export type OrgMe = { canRegister?: boolean; org: { id: string; name: string; registrationNumber?: string } | null; role?: 'admin' | 'member'; sharing?: boolean; sharedAt?: string | null; teamId?: string | null; teams?: { id: string; name: string }[]; assignments?: Assignment[] };
export type AdminMember = { synthetic?: boolean; id: string; name: string; currentRole: string; skills: string[]; goalRoleId: string | null; teamId: string | null; completedSteps: number; completedRecommendations: string[] };
export type AdminView = { org: { id: string; name: string; joinCode: string }; company: CompanyDetails; counts: { joined: number; sharing: number }; teams: OrgTeam[]; recommendations: (Assignment & { createdAt?: string })[]; members: AdminMember[] };

// Company endpoints are plain JSON; the server decides who may see what (see api-server/src/routes/org.ts).
export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (r.status === 204) return undefined as T;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? 'Something went wrong. Please try again.');
  return j as T;
}
export const useOrgMe = () => useQuery<OrgMe>({ queryKey: ['org', 'me'], queryFn: () => api<OrgMe>('GET', '/org/me'), retry: false, staleTime: 15_000 });
export const useOrgAdmin = (enabled: boolean) => useQuery<AdminView>({ queryKey: ['org', 'admin'], queryFn: () => api<AdminView>('GET', '/org/admin'), enabled, retry: false, refetchInterval: 30_000 });

export const hasSkill = (skills: string[], s: string) => skills.some(x => x.toLowerCase() === s.toLowerCase());
export function teamGaps(team: OrgTeam, members: AdminMember[]) {
  const people = members.filter(m => m.teamId === team.id);
  return { people, rows: team.requiredSkills.map(skill => { const have = people.filter(m => hasSkill(m.skills, skill)).length; return { skill, have, total: people.length, gap: people.length - have }; }).sort((a, b) => b.gap - a.gap || a.skill.localeCompare(b.skill)) };
}

// Rank teams from the biggest skill gap to the smallest. Coverage = skills present / skills needed, counted across every
// sharing member of the team. Teams with no sharing members or no required skills cannot be compared and are listed apart.
export type TeamRank = { team: OrgTeam; rank: number; people: number; required: number; coverage: number; missing: number; worst: { skill: string; have: number; total: number }[]; rows: ReturnType<typeof teamGaps>['rows'] };
export function rankTeams(teams: OrgTeam[], members: AdminMember[]) {
  const all = teams.map(team => { const g = teamGaps(team, members); const n = g.people.length; const k = team.requiredSkills.length; const have = g.rows.reduce((t, r) => t + r.have, 0);
    return { team, people: n, required: k, have, slots: n * k, rows: g.rows }; });
  const comparable = all.filter(r => r.slots > 0).map(r => ({ team: r.team, people: r.people, required: r.required, coverage: r.have / r.slots, missing: r.slots - r.have, rows: r.rows, worst: r.rows.filter(x => x.gap > 0).slice(0, 3) }))
    .sort((a, b) => a.coverage - b.coverage || b.missing - a.missing || a.team.name.localeCompare(b.team.name));
  let prev = -1, place = 0;
  const ranked: TeamRank[] = comparable.map((r, i) => { const c = Math.round(r.coverage * 1000); if (c !== prev) { place = i + 1; prev = c; } return { ...r, rank: place }; });
  const unranked = all.filter(r => r.slots === 0).map(r => ({ team: r.team, people: r.people, required: r.required }));
  return { ranked, unranked };
}
