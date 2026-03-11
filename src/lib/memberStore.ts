// This file is now just a re-export shim so existing imports don't break.
// All real data comes from src/lib/api.ts
// Kimi: update any component that imported from here to use api.ts directly.

export { queryMember as findMember } from "./api";