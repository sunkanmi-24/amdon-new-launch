import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { queryMember, MemberProfile } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft, Search, UserX, User, MapPin,
  Phone, Mail, Building2, CalendarDays, Loader2,
} from "lucide-react";

// ─── Profile Result Card ────────────────────────────────────────
const ProfileResultCard = ({ profile }: { profile: MemberProfile }) => {
  const fullName = [profile.bio.first_name, profile.bio.middle_name, profile.bio.last_name]
    .filter(Boolean)
    .join(" ");

  const initials = `${profile.bio.first_name[0] ?? ""}${profile.bio.last_name[0] ?? ""}`.toUpperCase();

  return (
    <div className="bg-card border rounded-2xl overflow-hidden shadow-md">
      {/* Top band */}
      <div className="bg-gradient-to-r from-primary to-blue-600 p-5 flex items-center gap-4">
        {profile.bio.photo_url ? (
          <img
            src={profile.bio.photo_url}
            alt={fullName}
            className="w-14 h-14 rounded-xl object-cover border-2 border-white/30 shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-white/20 border-2 border-white/30 flex items-center justify-center shrink-0">
            <span className="text-white font-heading font-bold text-xl">{initials}</span>
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-white font-heading font-bold text-lg truncate">{fullName}</h3>
          <p className="text-blue-100 text-sm">{profile.bio.occupation}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="font-mono text-xs bg-white/15 text-white px-2 py-0.5 rounded-md">
              {profile.memberId}
            </span>
            <Badge
              variant="secondary"
              className="text-[10px] h-5 bg-green-400/20 text-green-200 border-green-400/30"
            >
              {profile.accountStatus}
            </Badge>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            icon: <MapPin className="w-3.5 h-3.5" />,
            label: "Location",
            value: `${profile.location.lga}, ${profile.location.state}`,
          },
          {
            icon: <Phone className="w-3.5 h-3.5" />,
            label: "Phone",
            value: profile.contact.phone_primary,
          },
          {
            icon: <Mail className="w-3.5 h-3.5" />,
            label: "Email",
            value: profile.contact.email,
          },
          {
            icon: <Building2 className="w-3.5 h-3.5" />,
            label: "Business Category",
            value: profile.location.dealership_category || "—",
          },
          {
            icon: <CalendarDays className="w-3.5 h-3.5" />,
            label: "Member Since",
            value: new Date(profile.registrationDate).toLocaleDateString("en-NG", {
              year: "numeric", month: "short", day: "numeric",
            }),
          },
        ].map(({ icon, label, value }) => (
          <div
            key={label}
            className="flex items-start gap-2.5 bg-muted/40 rounded-xl px-3.5 py-2.5"
          >
            <div className="text-primary mt-0.5 shrink-0">{icon}</div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {label}
              </p>
              <p className="text-sm font-semibold truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {profile.location.dealership_name && (
        <div className="px-4 pb-4">
          <div className="bg-muted/40 rounded-xl px-3.5 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
              Dealership
            </p>
            <p className="text-sm font-semibold">{profile.location.dealership_name}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main QueryPage ─────────────────────────────────────────────

const QueryPage = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<MemberProfile | null | "not_found">(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    setResult(null);
    try {
      const data = await queryMember(q);
      if (data.found && data.profile) {
        setResult(data.profile);
      } else {
        setResult("not_found");
      }
    } catch (err) {
      toast.error((err as Error).message);
      setResult("not_found");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClear = () => {
    setQuery("");
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Search className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-base leading-tight">
                Member ID Lookup
              </h1>
              <p className="text-[11px] text-muted-foreground">Search by ID or full name</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-xl space-y-6">
        {/* Search Box */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Search for a member</p>
            <p className="text-xs text-muted-foreground">
              Enter a Member ID (e.g. <span className="font-mono">AMDON-FC-2026-0001</span>) or
              a member's full name.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="AMDON-FC-2026-0001 or John Doe"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-11"
              disabled={isSearching}
            />
            <Button onClick={handleSearch} disabled={isSearching || !query.trim()} className="h-11 px-5">
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Not found state */}
        {result === "not_found" && (
          <div className="bg-card border rounded-2xl p-8 text-center space-y-3 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <UserX className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-heading font-semibold">No member found</h3>
            <p className="text-sm text-muted-foreground">
              No records match{" "}
              <span className="font-medium text-foreground">"{query}"</span>. Check the
              ID or name and try again.
            </p>
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear & try again
            </Button>
          </div>
        )}

        {/* Result card */}
        {result && result !== "not_found" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">1 member found</p>
              <Button variant="ghost" size="sm" className="text-xs" onClick={handleClear}>
                New search
              </Button>
            </div>
            <ProfileResultCard profile={result} />
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryPage;