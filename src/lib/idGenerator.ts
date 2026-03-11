// ID generation is now handled server-side.
// The backend returns the memberId after POST /api/registration/submit.
// This file is kept as a no-op to avoid breaking any existing imports.

/** @deprecated — use submitRegistration() from api.ts instead */
export function generateMemberId(_stateCode: string): string {
  console.warn("generateMemberId() is deprecated. ID is now generated server-side.");
  return "PENDING";
}