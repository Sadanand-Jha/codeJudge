import apiClient from "@/lib/axios";
import type { UserProfile } from "@/types/user";

export async function getProfile(): Promise<UserProfile> {
  const response = await apiClient.get<UserProfile>("/v1/user/profile");
  return response.data;
}

/* =============================================
   Editable Profile Fields
   ============================================= */

export interface UpdateProfilePayload {
  displayName?: string;
  username?: string;
  email?: string;
}

export interface UpdateProfileResult {
  username: string;
  email: string;
  displayName: string | null;
  token?: string;
}

/** PATCH /api/v1/user/profile — updates display name, username and email. */
export async function updateProfile(payload: UpdateProfilePayload): Promise<UpdateProfileResult> {
  const response = await apiClient.patch<UpdateProfileResult>("/v1/user/profile", payload);
  return response.data;
}

/* =============================================
   Profile Location — Country / State / College
   ============================================= */

export interface LocationOption {
  id: number;
  label: string;
}

interface CountryDTO {
  id: number;
  name: string;
}

interface StateDTO {
  id: number;
  name: string;
  country_id: number;
}

interface CollegeDTO {
  id: number;
  name: string;
  state_id: number;
}

/**
 * Search countries from the backend.
 * Suitable to be passed directly as a SearchableDropdown `searchFn`.
 */
export async function fetchCountries(
  query: string,
  signal?: AbortSignal
): Promise<LocationOption[]> {
  const response = await apiClient.get<CountryDTO[]>(
    "/v1/user/profile/countries",
    { signal }
  );
  const q = query.trim().toLowerCase();
  return response.data
    .filter((c) => c.name.toLowerCase().includes(q))
    .map((c) => ({ id: c.id, label: c.name }));
}

/**
 * Search states belonging to a country.
 * Returns an empty list when no country has been selected yet.
 */
export async function fetchStatesByCountry(
  countryId: number,
  query: string,
  signal?: AbortSignal
): Promise<LocationOption[]> {
  if (!countryId) return [];
  const response = await apiClient.get<StateDTO[]>("/v1/user/profile/states", {
    params: { countryId },
    signal,
  });
  const q = query.trim().toLowerCase();
  return response.data
    .filter((s) => s.name.toLowerCase().includes(q))
    .map((s) => ({ id: s.id, label: s.name }));
}

/**
 * Search colleges belonging to a state.
 * Returns an empty list when no state has been selected yet.
 */
export async function fetchCollegesByState(
  stateId: number,
  query: string,
  signal?: AbortSignal
): Promise<LocationOption[]> {
  if (!stateId) return [];
  const response = await apiClient.get<CollegeDTO[]>("/v1/user/profile/colleges", {
    params: { stateId },
    signal,
  });
  const q = query.trim().toLowerCase();
  return response.data
    .filter((c) => c.name.toLowerCase().includes(q))
    .map((c) => ({ id: c.id, label: c.name }));
}

/**
 * Persist the user's country / state / college selection.
 * Only the non-null fields are sent to the backend.
 */
export interface ProfileLocation {
  countryId: number | null;
  stateId: number | null;
  collegeId: number | null;
}

export async function updateProfileLocation(payload: {
  countryId?: number | null;
  stateId?: number | null;
  collegeId?: number | null;
}): Promise<ProfileLocation> {
  const body: Record<string, number> = {};
  if (payload.countryId != null) body.countryId = payload.countryId;
  if (payload.stateId != null) body.stateId = payload.stateId;
  if (payload.collegeId != null) body.collegeId = payload.collegeId;
  const response = await apiClient.patch<ProfileLocation>(
    "/v1/user/profile/location",
    body
  );
  return response.data;
}

/* =============================================
   Minimal public user lookup (for collaborators)
   GET /api/v1/user/users/:userId
   Returns only { id, username } — no private info.
   ============================================= */

export interface UserLookupResult {
  id: string;
  username: string;
}

export async function lookupUserById(userId: string): Promise<UserLookupResult> {
  const response = await apiClient.get<UserLookupResult>(`/v1/user/users/${encodeURIComponent(userId)}`);
  return response.data;
}

/* =============================================
   Public student profile
   GET /api/v1/user/public/users/:username
   Safe, display-only fields for classmates.
   ============================================= */

export interface PublicStudentProfile {
  id: string;
  username: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  rating: number;
  maxRating: number;
  isVerified: boolean;
  memberSince: string | null;
  avatarId: number | null;
  avatarUrl: string | null;
  college: string | null;
  country: string | null;
  state: string | null;
}

export async function getPublicStudentProfile(
  username: string,
  signal?: AbortSignal
): Promise<PublicStudentProfile> {
  const response = await apiClient.get<PublicStudentProfile>(
    `/v1/user/public/users/${encodeURIComponent(username)}`,
    { signal }
  );
  return response.data;
}
