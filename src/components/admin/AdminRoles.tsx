import { useState, useEffect, useCallback } from "react";
import { getAdmins, addAdmin, updateAdmin, AdminUser } from "@/lib/adminApi";
import { PlusCircle, Loader2, AlertCircle, Shield, Edit2, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const ROLES = ["super_admin", "admin", "moderator", "viewer"];

const ALL_PERMISSIONS = [
  { id: "view_dashboard", label: "View Dashboard" },
  { id: "view_members", label: "View Members" },
  { id: "edit_members", label: "Edit Members" },
  { id: "view_payments", label: "View Payments" },
  { id: "record_payments", label: "Record Payments" },
  { id: "view_yearly_dues", label: "View Yearly Dues" },
  { id: "record_yearly_dues", label: "Record Yearly Dues" },
  { id: "view_reports", label: "View Reports" },
  { id: "manage_reports", label: "Manage Reports" },
  { id: "manage_roles", label: "Manage Roles" },
  { id: "use_api_tools", label: "Use API Tools" },
];

const ROLE_DEFAULTS: Record<string, string[]> = {
  super_admin: ALL_PERMISSIONS.map(p => p.id),
  admin: ["view_dashboard","view_members","edit_members","view_payments","record_payments","view_yearly_dues","record_yearly_dues","view_reports","manage_reports","use_api_tools"],
  moderator: ["view_dashboard","view_members","view_payments","view_yearly_dues","view_reports","manage_reports"],
  viewer: ["view_dashboard","view_members","view_payments","view_yearly_dues","view_reports"],
};

export default function AdminRoles() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ email: "", role: "admin", permissions: ROLE_DEFAULTS["admin"], password: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdmins();
      setAdmins(res.admins || []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePermission = (permId: string, current: string[], setter: (p: string[]) => void) => {
    setter(current.includes(permId) ? current.filter(p => p !== permId) : [...current, permId]);
  };

  const handleAdd = async () => {
    if (!form.email) { toast.error("Email is required"); return; }
    setSaving(true);
    try {
      await addAdmin(form);
      toast.success("Admin added successfully");
      setShowAdd(false);
      setForm({ email: "", role: "admin", permissions: ROLE_DEFAULTS["admin"], password: "" });
      load();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editAdmin) return;
    setSaving(true);
    try {
      await updateAdmin(editAdmin.id, { role: editAdmin.role, permissions: editAdmin.permissions });
      toast.success("Admin updated");
      setEditAdmin(null);
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
          <h2 className="text-lg font-bold font-heading">Roles & Access Control</h2>
          <p className="text-sm text-muted-foreground">Manage admin users and their permissions</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Add Admin
        </Button>
      </div>

      {/* Role overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ROLES.map(role => {
          const count = admins.filter(a => a.role === role).length;
          return (
            <Card key={role}>
              <CardContent className="p-4">
                <Shield className="h-5 w-5 text-primary mb-2" />
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{role.replace("_", " ")}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Admins list */}
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Admin Users</CardTitle>
            <CardDescription className="text-xs">{admins.length} admin account{admins.length !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Permissions</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden lg:table-cell">Last Login</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">{admin.email[0]?.toUpperCase()}</span>
                        </div>
                        <span className="text-sm">{admin.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={admin.role} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(admin.permissions || []).slice(0, 4).map(p => (
                          <span key={p} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                            {p.replace(/_/g, " ")}
                          </span>
                        ))}
                        {(admin.permissions || []).length > 4 && (
                          <span className="text-[10px] text-muted-foreground">+{(admin.permissions || []).length - 4} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {admin.last_login
                        ? new Date(admin.last_login).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditAdmin({ ...admin })}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">No admins found</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Add Admin Dialog */}
      {showAdd && (
        <Dialog open onOpenChange={() => setShowAdd(false)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Admin User</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs">Email Address *</Label>
                <Input className="h-9 text-sm mt-1" type="email" placeholder="admin@amdon.org"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Password *</Label>
                <Input className="h-9 text-sm mt-1" type="password" placeholder="Min. 8 characters"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={v => setForm(f => ({ ...f, role: v, permissions: ROLE_DEFAULTS[v] || [] }))}
                >
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-2 block">Permissions</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-border p-3">
                  {ALL_PERMISSIONS.map(perm => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer hover:text-foreground text-sm">
                      <Checkbox
                        checked={form.permissions.includes(perm.id)}
                        onCheckedChange={() => togglePermission(perm.id, form.permissions, perms => setForm(f => ({ ...f, permissions: perms })))}
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={saving} className="flex-1">
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Add Admin
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Admin Dialog */}
      {editAdmin && (
        <Dialog open onOpenChange={() => setEditAdmin(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Admin — {editAdmin.email}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs">Role</Label>
                <Select
                  value={editAdmin.role}
                  onValueChange={v => setEditAdmin(prev => prev ? {
                    ...prev, role: v, permissions: ROLE_DEFAULTS[v] || prev.permissions
                  } : prev)}
                >
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-2 block">Permissions</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-border p-3">
                  {ALL_PERMISSIONS.map(perm => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer hover:text-foreground text-sm">
                      <Checkbox
                        checked={(editAdmin.permissions || []).includes(perm.id)}
                        onCheckedChange={() => {
                          const current = editAdmin.permissions || [];
                          const updated = current.includes(perm.id)
                            ? current.filter(p => p !== perm.id)
                            : [...current, perm.id];
                          setEditAdmin(prev => prev ? { ...prev, permissions: updated } : prev);
                        }}
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleUpdate} disabled={saving} className="flex-1">
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Save Changes
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditAdmin(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    super_admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    moderator: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    viewer: "bg-gray-100 text-gray-600 dark:bg-gray-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${map[role] ?? "bg-muted text-muted-foreground"}`}>
      {role.replace("_", " ")}
    </span>
  );
}
