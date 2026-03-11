// Client-side ID generation (demo). In production, use Supabase Edge Function with row-level locking.
const counters: Record<string, number> = {};

export function generateMemberId(stateCode: string): string {
  const year = new Date().getFullYear();
  const key = `${stateCode}-${year}`;
  counters[key] = (counters[key] || 0) + 1;
  const sequence = String(counters[key]).padStart(4, "0");
  return `AMDON-${stateCode}-${year}-${sequence}`;
}
