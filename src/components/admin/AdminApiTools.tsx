import { useState } from "react";
import { apiSearchMember, apiAddMember, apiUpdateMember, AdminMember } from "@/lib/adminApi";
import { Search, PlusCircle, Edit2, Loader2, AlertCircle, CheckCircle, Code2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminApiTools() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold font-heading">API Tools</h2>
        <p className="text-sm text-muted-foreground">Add, search, and update members via API operations</p>
      </div>

      <Tabs defaultValue="search">
        <TabsList className="h-9">
          <TabsTrigger value="search" className="text-xs gap-1.5"><Search className="h-3.5 w-3.5" />Search</TabsTrigger>
          <TabsTrigger value="add" className="text-xs gap-1.5"><PlusCircle className="h-3.5 w-3.5" />Add Member</TabsTrigger>
          <TabsTrigger value="update" className="text-xs gap-1.5"><Edit2 className="h-3.5 w-3.5" />Update Member</TabsTrigger>
          <TabsTrigger value="docs" className="text-xs gap-1.5"><Code2 className="h-3.5 w-3.5" />API Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-4">
          <SearchTab />
        </TabsContent>
        <TabsContent value="add" className="mt-4">
          <AddMemberTab />
        </TabsContent>
        <TabsContent value="update" className="mt-4">
          <UpdateMemberTab />
        </TabsContent>
        <TabsContent value="docs" className="mt-4">
          <ApiDocsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Search Tab ────────────────────────────────────────────────
function SearchTab() {
  const [searchBy, setSearchBy] = useState<"id" | "phone" | "email">("id");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<AdminMember | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!value.trim()) { toast.error("Enter a search value"); return; }
    setLoading(true);
    setError(null);
    setNotFound(false);
    setResult(null);
    try {
      const res = await apiSearchMember({ [searchBy]: value.trim() });
      if (res.found && res.member) {
        setResult(res.member);
      } else {
        setNotFound(true);
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Search Member</CardTitle>
        <CardDescription className="text-xs">Find a member by ID, phone number, or email</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["id", "phone", "email"] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setSearchBy(opt)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                searchBy === opt
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              By {opt.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            className="h-9 text-sm flex-1"
            placeholder={
              searchBy === "id" ? "AMDON-FC-2026-0001" :
              searchBy === "phone" ? "08012345678" : "member@email.com"
            }
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          <Button size="sm" onClick={handleSearch} disabled={loading} className="h-9 px-4">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {notFound && (
          <p className="text-sm text-muted-foreground text-center py-4">No member found matching that {searchBy}</p>
        )}
        {result && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/40 px-4 py-2 flex items-center gap-2 border-b border-border">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-600">Member found</span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Field label="Member ID" value={result.member_id} mono />
              <Field label="Status" value={result.account_status} />
              <Field label="Full Name" value={`${result.member_bio?.first_name} ${result.member_bio?.last_name}`} />
              <Field label="Gender" value={result.member_bio?.gender || "—"} />
              <Field label="Occupation" value={result.member_bio?.occupation || "—"} />
              <Field label="State" value={result.member_location?.state || "—"} />
              <Field label="LGA" value={result.member_location?.lga || "—"} />
              <Field label="Email" value={result.member_contact?.email || "—"} />
              <Field label="Phone" value={result.member_contact?.phone_primary || "—"} />
              <Field label="Registered" value={result.created_at ? new Date(result.created_at).toLocaleDateString("en-NG") : "—"} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add Member Tab ────────────────────────────────────────────
function AddMemberTab() {
  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "",
    email: "", phonePrimary: "", phoneSecondary: "",
    state: "", lga: "", fullAddress: "",
    dealershipName: "", occupation: "", gender: "",
    dateOfBirth: "", nationality: "Nigerian",
    nokName: "", nokPhone: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleAdd = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.state || !form.lga) {
      toast.error("First name, last name, email, state and LGA are required");
      return;
    }
    setLoading(true);
    try {
      const res = await apiAddMember(form as Record<string, unknown>);
      setResult(res.memberId);
      toast.success(`Member added! ID: ${res.memberId}`);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Add Member via API</CardTitle>
        <CardDescription className="text-xs">Register a new member directly without the registration form</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result && (
          <div className="flex items-center gap-2 text-sm bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Member created: <span className="font-mono font-bold">{result}</span></span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="First Name *" value={form.firstName} onChange={f("firstName")} placeholder="John" />
          <FormField label="Middle Name" value={form.middleName} onChange={f("middleName")} placeholder="A." />
          <FormField label="Last Name *" value={form.lastName} onChange={f("lastName")} placeholder="Doe" />
          <FormField label="Gender" value={form.gender} onChange={f("gender")} placeholder="Male / Female" />
          <FormField label="Date of Birth" value={form.dateOfBirth} onChange={f("dateOfBirth")} placeholder="1990-01-01" />
          <FormField label="Occupation" value={form.occupation} onChange={f("occupation")} placeholder="Dealer" />
          <FormField label="Email *" value={form.email} onChange={f("email")} placeholder="john@example.com" />
          <FormField label="Phone *" value={form.phonePrimary} onChange={f("phonePrimary")} placeholder="08012345678" />
          <FormField label="Alt Phone" value={form.phoneSecondary} onChange={f("phoneSecondary")} placeholder="Optional" />
          <FormField label="State *" value={form.state} onChange={f("state")} placeholder="Lagos" />
          <FormField label="LGA *" value={form.lga} onChange={f("lga")} placeholder="Ikeja" />
          <FormField label="Dealership Name" value={form.dealershipName} onChange={f("dealershipName")} placeholder="Optional" />
          <FormField label="Next of Kin Name" value={form.nokName} onChange={f("nokName")} placeholder="Jane Doe" />
          <FormField label="Next of Kin Phone" value={form.nokPhone} onChange={f("nokPhone")} placeholder="08098765432" />
        </div>
        <div>
          <Label className="text-xs">Full Address</Label>
          <Input className="h-9 text-sm mt-1" value={form.fullAddress} onChange={f("fullAddress")} placeholder="123 Main St, Lagos" />
        </div>
        <Button size="sm" onClick={handleAdd} disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-2" />}
          Add Member
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Update Member Tab ──────────────────────────────────────────
function UpdateMemberTab() {
  const [identifierType, setIdentifierType] = useState<"id" | "phone" | "email">("id");
  const [identifier, setIdentifier] = useState("");
  const [updatesJson, setUpdatesJson] = useState(`{
  "bio": { "occupation": "New Occupation" },
  "contact": { "phone_primary": "08012345678" },
  "accountStatus": "active"
}`);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async () => {
    if (!identifier.trim()) { toast.error("Enter an identifier"); return; }
    let updates: Record<string, unknown>;
    try {
      updates = JSON.parse(updatesJson);
    } catch {
      toast.error("Invalid JSON in updates field");
      return;
    }
    setLoading(true);
    setSuccess(false);
    try {
      await apiUpdateMember({ [identifierType]: identifier.trim(), updates });
      setSuccess(true);
      toast.success("Member updated successfully");
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Update Member via API</CardTitle>
        <CardDescription className="text-xs">Update member data by ID, phone, or email</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs mb-2 block">Identify By</Label>
          <div className="flex flex-wrap gap-2">
            {(["id", "phone", "email"] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setIdentifierType(opt)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                  identifierType === opt
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {opt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">
            {identifierType === "id" ? "Member ID" : identifierType === "phone" ? "Phone Number" : "Email"}
          </Label>
          <Input
            className="h-9 text-sm mt-1"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder={identifierType === "id" ? "AMDON-FC-2026-0001" : identifierType === "phone" ? "08012345678" : "member@email.com"}
          />
        </div>
        <div>
          <Label className="text-xs">Updates (JSON)</Label>
          <Textarea
            className="text-sm mt-1 font-mono text-xs resize-none"
            rows={8}
            value={updatesJson}
            onChange={e => setUpdatesJson(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Supported keys: <code className="bg-muted px-1 rounded">bio</code>, <code className="bg-muted px-1 rounded">contact</code>, <code className="bg-muted px-1 rounded">location</code>, <code className="bg-muted px-1 rounded">accountStatus</code>
          </p>
        </div>
        {success && (
          <div className="flex items-center gap-2 text-sm bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            Member updated successfully
          </div>
        )}
        <Button size="sm" onClick={handleUpdate} disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Edit2 className="h-4 w-4 mr-2" />}
          Update Member
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── API Docs Tab ───────────────────────────────────────────────
function ApiDocsTab() {
  const BASE = "https://amdon-backened.vercel.app/api";
  const endpoints = [
    {
      method: "POST", path: "/admin/api/members",
      desc: "Add a new member",
      body: `{ "firstName": "John", "lastName": "Doe", "email": "...", "state": "Lagos", "lga": "Ikeja", ... }`,
    },
    {
      method: "GET", path: "/admin/api/members/search?id=AMDON-FC-2026-0001",
      desc: "Search by ID, phone, or email",
      body: null,
    },
    {
      method: "PATCH", path: "/admin/api/members/update",
      desc: "Update member by ID, phone, or email",
      body: `{ "id": "AMDON-FC-2026-0001", "updates": { "bio": { ... }, "accountStatus": "active" } }`,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Code2 className="h-4 w-4" />
          API Reference
        </CardTitle>
        <CardDescription className="text-xs">Base URL: <code className="bg-muted px-1 rounded text-[10px]">{BASE}</code></CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs space-y-1">
          <p className="font-medium text-sm mb-2">Authentication</p>
          <p className="text-muted-foreground">Include one of the following headers:</p>
          <code className="block bg-muted rounded p-2 mt-1 font-mono">Authorization: Bearer &lt;admin_jwt&gt;</code>
          <code className="block bg-muted rounded p-2 mt-1 font-mono">x-admin-secret: &lt;ADMIN_SECRET&gt;</code>
        </div>

        {endpoints.map((ep, i) => (
          <div key={i} className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-b border-border">
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold font-mono",
                ep.method === "GET" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                ep.method === "POST" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {ep.method}
              </span>
              <code className="text-xs font-mono text-foreground">{ep.path}</code>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs text-muted-foreground">{ep.desc}</p>
              {ep.body && (
                <pre className="text-[10px] bg-muted rounded p-2 overflow-x-auto font-mono text-muted-foreground">
                  {ep.body}
                </pre>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────
function FormField({ label, value, onChange, placeholder }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="h-9 text-sm mt-1" value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn("text-sm mt-0.5", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}
