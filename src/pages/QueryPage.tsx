import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { searchMembers } from "@/lib/memberStore";
import MemberProfileCard from "@/components/MemberProfileCard";
import { MemberRecord } from "@/types/registration";
import { ArrowLeft, Search, UserX } from "lucide-react";

const QueryPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberRecord[] | null>(null);

  const handleSearch = () => {
    if (!query.trim()) return;
    const found = searchMembers(query);
    setResults(found);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="font-heading font-bold text-lg">Member ID Lookup</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Search for a Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Member ID (e.g. AMDON-FC-2026-0001) or name"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-1.5" /> Search
              </Button>
            </div>

            {results !== null && results.length === 0 && (
              <div className="text-center py-10">
                <UserX className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium mb-1">No member found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  No records match "{query}". Please check the ID or name and try again.
                </p>
                <Button variant="outline" onClick={() => { setQuery(""); setResults(null); }}>
                  Clear & Retry
                </Button>
              </div>
            )}

            {results && results.length > 0 && (
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">{results.length} result{results.length > 1 ? "s" : ""} found</p>
                {results.map((m) => (
                  <MemberProfileCard key={m.memberId} member={m} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QueryPage;
