import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { CareerGoalInput, GetTrendSignalsParams, HealthStatus, LearnerProfileInput, LearningProgressInput, TeamMember, TeamMemberInput, TrendSignalSnapshot, TrendSourceError, Workspace } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getGetWorkspaceUrl: () => string;
/**
 * @summary Read the signed-in user's private workspace
 */
export declare const getWorkspace: (options?: Parameters<typeof customFetch>[1]) => Promise<Workspace>;
export declare const getGetWorkspaceQueryKey: () => readonly ["/api/workspace"];
export declare const getGetWorkspaceQueryOptions: <TData = Awaited<ReturnType<typeof getWorkspace>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorkspace>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWorkspace>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWorkspaceQueryResult = NonNullable<Awaited<ReturnType<typeof getWorkspace>>>;
export type GetWorkspaceQueryError = ErrorType<void>;
/**
 * @summary Read the signed-in user's private workspace
 */
export declare function useGetWorkspace<TData = Awaited<ReturnType<typeof getWorkspace>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorkspace>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getDeleteWorkspaceUrl: () => string;
/**
 * @summary Delete the signed-in user's profile, progress and team records
 */
export declare const deleteWorkspace: (options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteWorkspaceMutationKey: () => readonly ["deleteWorkspace"];
export declare const getDeleteWorkspaceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteWorkspace>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteWorkspace>>, TError, void, TContext>;
export type DeleteWorkspaceMutationResult = NonNullable<Awaited<ReturnType<typeof deleteWorkspace>>>;
export type DeleteWorkspaceMutationError = ErrorType<unknown>;
/**
* @summary Delete the signed-in user's profile, progress and team records
*/
export declare const useDeleteWorkspace: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteWorkspace>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteWorkspace>>, TError, void, TContext>;
export declare const getSaveLearnerProfileUrl: () => string;
/**
 * @summary Save the signed-in user's skills profile
 */
export declare const saveLearnerProfile: (learnerProfileInput: LearnerProfileInput, options?: Parameters<typeof customFetch>[1]) => Promise<LearnerProfileInput>;
export declare const getSaveLearnerProfileMutationKey: () => readonly ["saveLearnerProfile"];
export declare const getSaveLearnerProfileMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveLearnerProfile>>, TError, SaveLearnerProfileMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof saveLearnerProfile>>, TError, SaveLearnerProfileMutationVariables, TContext>;
export type SaveLearnerProfileMutationResult = NonNullable<Awaited<ReturnType<typeof saveLearnerProfile>>>;
export type SaveLearnerProfileMutationBody = BodyType<LearnerProfileInput>;
export type SaveLearnerProfileMutationError = ErrorType<unknown>;
export type SaveLearnerProfileMutationVariables = {
    data: BodyType<LearnerProfileInput>;
};
/**
* @summary Save the signed-in user's skills profile
*/
export declare const useSaveLearnerProfile: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveLearnerProfile>>, TError, SaveLearnerProfileMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof saveLearnerProfile>>, TError, SaveLearnerProfileMutationVariables, TContext>;
export declare const getSaveLearningProgressUrl: (stepKey: string) => string;
/**
 * @summary Set completion of a learning step for the current user
 */
export declare const saveLearningProgress: (stepKey: string, learningProgressInput: LearningProgressInput, options?: Parameters<typeof customFetch>[1]) => Promise<LearningProgressInput>;
export declare const getSaveLearningProgressMutationKey: () => readonly ["saveLearningProgress"];
export declare const getSaveLearningProgressMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveLearningProgress>>, TError, SaveLearningProgressMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof saveLearningProgress>>, TError, SaveLearningProgressMutationVariables, TContext>;
export type SaveLearningProgressMutationResult = NonNullable<Awaited<ReturnType<typeof saveLearningProgress>>>;
export type SaveLearningProgressMutationBody = BodyType<LearningProgressInput>;
export type SaveLearningProgressMutationError = ErrorType<unknown>;
export type SaveLearningProgressMutationVariables = {
    stepKey: string;
    data: BodyType<LearningProgressInput>;
};
/**
* @summary Set completion of a learning step for the current user
*/
export declare const useSaveLearningProgress: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveLearningProgress>>, TError, SaveLearningProgressMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof saveLearningProgress>>, TError, SaveLearningProgressMutationVariables, TContext>;
export declare const getSaveCareerGoalUrl: () => string;
/**
 * @summary Save the current user's chosen career direction
 */
export declare const saveCareerGoal: (careerGoalInput: CareerGoalInput, options?: Parameters<typeof customFetch>[1]) => Promise<CareerGoalInput>;
export declare const getSaveCareerGoalMutationKey: () => readonly ["saveCareerGoal"];
export declare const getSaveCareerGoalMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveCareerGoal>>, TError, SaveCareerGoalMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof saveCareerGoal>>, TError, SaveCareerGoalMutationVariables, TContext>;
export type SaveCareerGoalMutationResult = NonNullable<Awaited<ReturnType<typeof saveCareerGoal>>>;
export type SaveCareerGoalMutationBody = BodyType<CareerGoalInput>;
export type SaveCareerGoalMutationError = ErrorType<unknown>;
export type SaveCareerGoalMutationVariables = {
    data: BodyType<CareerGoalInput>;
};
/**
* @summary Save the current user's chosen career direction
*/
export declare const useSaveCareerGoal: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveCareerGoal>>, TError, SaveCareerGoalMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof saveCareerGoal>>, TError, SaveCareerGoalMutationVariables, TContext>;
export declare const getListTeamMembersUrl: () => string;
/**
 * @summary List only the current user's managed team records
 */
export declare const listTeamMembers: (options?: Parameters<typeof customFetch>[1]) => Promise<TeamMember[]>;
export declare const getListTeamMembersQueryKey: () => readonly ["/api/team-members"];
export declare const getListTeamMembersQueryOptions: <TData = Awaited<ReturnType<typeof listTeamMembers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTeamMembers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTeamMembers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTeamMembersQueryResult = NonNullable<Awaited<ReturnType<typeof listTeamMembers>>>;
export type ListTeamMembersQueryError = ErrorType<unknown>;
/**
 * @summary List only the current user's managed team records
 */
export declare function useListTeamMembers<TData = Awaited<ReturnType<typeof listTeamMembers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTeamMembers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateTeamMemberUrl: () => string;
/**
 * @summary Add a team member to the current user's private workspace
 */
export declare const createTeamMember: (teamMemberInput: TeamMemberInput, options?: Parameters<typeof customFetch>[1]) => Promise<TeamMember>;
export declare const getCreateTeamMemberMutationKey: () => readonly ["createTeamMember"];
export declare const getCreateTeamMemberMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTeamMember>>, TError, CreateTeamMemberMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTeamMember>>, TError, CreateTeamMemberMutationVariables, TContext>;
export type CreateTeamMemberMutationResult = NonNullable<Awaited<ReturnType<typeof createTeamMember>>>;
export type CreateTeamMemberMutationBody = BodyType<TeamMemberInput>;
export type CreateTeamMemberMutationError = ErrorType<unknown>;
export type CreateTeamMemberMutationVariables = {
    data: BodyType<TeamMemberInput>;
};
/**
* @summary Add a team member to the current user's private workspace
*/
export declare const useCreateTeamMember: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTeamMember>>, TError, CreateTeamMemberMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTeamMember>>, TError, CreateTeamMemberMutationVariables, TContext>;
export declare const getUpdateTeamMemberUrl: (id: string) => string;
/**
 * @summary Update an owned team member
 */
export declare const updateTeamMember: (id: string, teamMemberInput: TeamMemberInput, options?: Parameters<typeof customFetch>[1]) => Promise<TeamMember>;
export declare const getUpdateTeamMemberMutationKey: () => readonly ["updateTeamMember"];
export declare const getUpdateTeamMemberMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTeamMember>>, TError, UpdateTeamMemberMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTeamMember>>, TError, UpdateTeamMemberMutationVariables, TContext>;
export type UpdateTeamMemberMutationResult = NonNullable<Awaited<ReturnType<typeof updateTeamMember>>>;
export type UpdateTeamMemberMutationBody = BodyType<TeamMemberInput>;
export type UpdateTeamMemberMutationError = ErrorType<unknown>;
export type UpdateTeamMemberMutationVariables = {
    id: string;
    data: BodyType<TeamMemberInput>;
};
/**
* @summary Update an owned team member
*/
export declare const useUpdateTeamMember: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTeamMember>>, TError, UpdateTeamMemberMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTeamMember>>, TError, UpdateTeamMemberMutationVariables, TContext>;
export declare const getDeleteTeamMemberUrl: (id: string) => string;
/**
 * @summary Delete an owned team member
 */
export declare const deleteTeamMember: (id: string, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteTeamMemberMutationKey: () => readonly ["deleteTeamMember"];
export declare const getDeleteTeamMemberMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTeamMember>>, TError, DeleteTeamMemberMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteTeamMember>>, TError, DeleteTeamMemberMutationVariables, TContext>;
export type DeleteTeamMemberMutationResult = NonNullable<Awaited<ReturnType<typeof deleteTeamMember>>>;
export type DeleteTeamMemberMutationError = ErrorType<unknown>;
export type DeleteTeamMemberMutationVariables = {
    id: string;
};
/**
* @summary Delete an owned team member
*/
export declare const useDeleteTeamMember: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTeamMember>>, TError, DeleteTeamMemberMutationVariables, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteTeamMember>>, TError, DeleteTeamMemberMutationVariables, TContext>;
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: Parameters<typeof customFetch>[1]) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetTrendSignalsUrl: (params?: GetTrendSignalsParams) => string;
/**
 * Aggregates Himalayas job-posting categories and keywords into an updatable skills signal snapshot.
 * @summary Fetch current public job-market signals
 */
export declare const getTrendSignals: (params?: GetTrendSignalsParams, options?: Parameters<typeof customFetch>[1]) => Promise<TrendSignalSnapshot>;
export declare const getGetTrendSignalsQueryKey: (params?: GetTrendSignalsParams) => readonly ["/api/trends", ...GetTrendSignalsParams[]];
export declare const getGetTrendSignalsQueryOptions: <TData = Awaited<ReturnType<typeof getTrendSignals>>, TError = ErrorType<TrendSourceError>>(params?: GetTrendSignalsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTrendSignals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTrendSignals>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTrendSignalsQueryResult = NonNullable<Awaited<ReturnType<typeof getTrendSignals>>>;
export type GetTrendSignalsQueryError = ErrorType<TrendSourceError>;
/**
 * @summary Fetch current public job-market signals
 */
export declare function useGetTrendSignals<TData = Awaited<ReturnType<typeof getTrendSignals>>, TError = ErrorType<TrendSourceError>>(params?: GetTrendSignalsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTrendSignals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map