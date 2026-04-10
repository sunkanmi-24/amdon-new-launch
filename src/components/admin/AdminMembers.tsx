import { useState, useEffect, useCallback } from "react";
import { getMembers, updateMember, AdminMember } from "@/lib/adminApi";
import {
  Search, Filter, ChevronLeft, ChevronRight, Edit2,
  Loader2, AlertCircle, User, CheckCircle, XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STATUS_OPTIONS = ["", "active", "inactive", "suspended", "pending"];
const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River",
  "Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano",
  "Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo",
  "Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"
];

export default function AdminMembers() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [editMember, setEditMember] = useState<AdminMember | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMembers({ page, limit: 20, state: stateFilter || undefined, status: statusFilter || undefined });
      setMembers(res.members);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, stateFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? members.filter((m) => {
        const name = `${m.member_bio?.first_name} ${m.member_bio?.last_name}`.toLowerCase();
        return (
          name.includes(search.toLowerCase()) ||
          m.member_id.toLowerCase().includes(search.toLowerCase()) ||
          m.member_contact?.email?.toLowerCase().includes(search.toLowerCase())
        );
      })
    : members;

  const handleSave = async () => {
    if (!editMember) return;
    setSaving(true);
    try {
      await updateMember(editMember.member_id, {
        accountStatus: editMember.account_status,
        bio: editMember.member_bio as Record<string, unknown>,
        contact: editMember.member_contact as Record<string, unknown>,
        location: editMember.member_location as Record<string, unknown>,
      });
      toast.success("Member updated successfully");
      setEditMember(null);
      load();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-heading">All Members</h2>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} total registrations</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, ID, email…"
              className="pl-8 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              {STATUS_OPTIONS.filter(Boolean).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="All states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All states</SelectItem>
              {NIGERIAN_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9" onClick={() => { setSearch(""); setStatusFilter(""); setStateFilter(""); }}>
            Clear
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button size="sm" onClick={load}>Retry</Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Member</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden md:table-cell">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden lg:table-cell">State / LGA</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Registered</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.member_id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {m.member_bio?.photo_url ? (
                            <img src={m.member_bio.photo_url} className="h-8 w-8 rounded-full object-cover" alt="" />
                          ) : (
                            <span className="text-xs font-bold text-primary">
                              {(m.member_bio?.first_name?.[0] ?? "")}{(m.member_bio?.last_name?.[0] ?? "")}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{m.member_bio?.first_name} {m.member_bio?.last_name}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{m.member_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-muted-foreground">{m.member_id}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-sm">{m.member_location?.state}</p>
                      <p className="text-xs text-muted-foreground">{m.member_location?.lga}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-xs">{m.member_contact?.email}</p>
                      <p className="text-xs text-muted-foreground">{m.member_contact?.phone_primary}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={m.account_status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditMember(m)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">No members found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      {editMember && (
        <Dialog open onOpenChange={() => setEditMember(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Member — {editMember.member_id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">First Name</Label>
                  <Input
                    className="h-8 text-sm mt-1"
                    value={editMember.member_bio?.first_name ?? ""}
                    onChange={(e) => setEditMember(prev => prev ? {
                      ...prev, member_bio: { ...prev.member_bio!, first_name: e.target.value }
                    } : prev)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Last Name</Label>
                  <Input
                    className="h-8 text-sm mt-1"
                    value={editMember.member_bio?.last_name ?? ""}
                    onChange={(e) => setEditMember(prev => prev ? {
                      ...prev, member_bio: { ...prev.member_bio!, last_name: e.target.value }
                    } : prev)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    className="h-8 text-sm mt-1"
                    value={editMember.member_contact?.email ?? ""}
                    onChange={(e) => setEditMember(prev => prev ? {
                      ...prev, member_contact: { ...prev.member_contact!, email: e.target.value }
                    } : prev)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input
                    className="h-8 text-sm mt-1"
                    value={editMember.member_contact?.phone_primary ?? ""}
                    onChange={(e) => setEditMember(prev => prev ? {
                      ...prev, member_contact: { ...prev.member_contact!, phone_primary: e.target.value }
                    } : prev)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Account Status</Label>
                <Select
                  value={editMember.account_status}
                  onValueChange={(v) => setEditMember(prev => prev ? { ...prev, account_status: v } : prev)}
                >
                  <SelectTrigger className="h-8 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["active","inactive","suspended","pending"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Save Changes
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}
