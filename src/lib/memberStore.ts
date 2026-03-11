import { MemberRecord } from "@/types/registration";

// In-memory store for demo. Replace with Supabase in production.
const members: MemberRecord[] = [];

export function addMember(member: MemberRecord) {
  members.push(member);
  // Also persist to localStorage for demo persistence
  localStorage.setItem("amdon_members", JSON.stringify(members));
}

export function getMembers(): MemberRecord[] {
  if (members.length === 0) {
    const stored = localStorage.getItem("amdon_members");
    if (stored) {
      const parsed = JSON.parse(stored) as MemberRecord[];
      members.push(...parsed);
    }
  }
  return members;
}

export function findMember(query: string): MemberRecord | undefined {
  const all = getMembers();
  const q = query.toLowerCase().trim();
  return all.find(
    (m) =>
      m.memberId.toLowerCase() === q ||
      `${m.bio.firstName} ${m.bio.middleName} ${m.bio.lastName}`.toLowerCase().includes(q)
  );
}

export function searchMembers(query: string): MemberRecord[] {
  const all = getMembers();
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return all.filter(
    (m) =>
      m.memberId.toLowerCase().includes(q) ||
      `${m.bio.firstName} ${m.bio.middleName} ${m.bio.lastName}`.toLowerCase().includes(q)
  );
}
