import { useState, useEffect, useCallback } from "react";
import { getReports, createReport, updateReport, Report } from "@/lib/adminApi";
import { PlusCircle, Loader2, AlertCircle, ChevronLeft, ChevronRight, MessageSquareWarning } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const ISSUE_TYPES = ["fraud", "impersonation", "misconduct", "fake_documents", "non_payment", "other"];

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [form, setForm] = useState({ reportedMemberId: "", issueType: "", description: "" });
  const [noteForm, setNoteForm] = useState({ status: "", adminNotes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReports({ page, limit: 20, status: statusFilter || undefined });
      setReports(res.reports || []);
      setTotal(res.total);
      setTotalPages(Math.ceil(res.total / 20));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.reportedMemberId || !form.issueType || !form.description) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      await createReport(form);
      toast.success("Report submitted");
      setShowCreate(false);
      setForm({ reportedMemberId: "", issueType: "", description: "" });
      load();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateReport = async () => {
    if (!viewReport) return;
    setSaving(true);
    try {
      await updateReport(viewReport.id, noteForm);
      toast.success("Report updated");
      setViewReport(null);
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
          <h2 className="text-lg font-bold font-heading">Issue Reports</h2>
          <p className="text-sm text-muted-foreground">Member issue reports and case management</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <PlusCircle className="h-4 w-4 mr-1.5" />
          New Report
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Reports list */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button size="sm" onClick={load}>Retry</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => {
              setViewReport(r);
              setNoteForm({ status: r.status, adminNotes: r.admin_notes || "" });
            }}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquareWarning className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="text-sm font-medium">{r.issue_type.replace(/_/g, " ")}</span>
                    <ReportStatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Against: <span className="font-mono font-medium">{r.reported_member_id}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0 ml-2">
                  {new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                </p>
              </CardContent>
            </Card>
          ))}
          {reports.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquareWarning className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No reports found</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Report Dialog */}
      {showCreate && (
        <Dialog open onOpenChange={() => setShowCreate(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Submit Issue Report</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Reported Member ID *</Label>
                <Input className="h-9 text-sm mt-1" placeholder="AMDON-XX-2026-XXXX"
                  value={form.reportedMemberId} onChange={e => setForm(f => ({ ...f, reportedMemberId: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Issue Type *</Label>
                <Select value={form.issueType} onValueChange={v => setForm(f => ({ ...f, issueType: v }))}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Description *</Label>
                <Textarea className="text-sm mt-1 resize-none" rows={4} placeholder="Describe the issue in detail…"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleCreate} disabled={saving} className="flex-1">
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Submit Report
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View/Update Report Dialog */}
      {viewReport && (
        <Dialog open onOpenChange={() => setViewReport(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Report — {viewReport.issue_type.replace(/_/g, " ")}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
                <div className="flex gap-2"><span className="text-muted-foreground w-24 shrink-0">Reported</span><span className="font-mono font-medium">{viewReport.reported_member_id}</span></div>
                <div className="flex gap-2"><span className="text-muted-foreground w-24 shrink-0">Filed on</span><span>{new Date(viewReport.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</span></div>
                <div className="flex gap-2"><span className="text-muted-foreground w-24 shrink-0">Status</span><ReportStatusBadge status={viewReport.status} /></div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm leading-relaxed">{viewReport.description}</p>
              </div>
              <hr className="border-border" />
              <div>
                <Label className="text-xs">Update Status</Label>
                <Select value={noteForm.status} onValueChange={v => setNoteForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Admin Notes</Label>
                <Textarea className="text-sm mt-1 resize-none" rows={3} placeholder="Internal notes…"
                  value={noteForm.adminNotes} onChange={e => setNoteForm(f => ({ ...f, adminNotes: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleUpdateReport} disabled={saving} className="flex-1">
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setViewReport(null)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ReportStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    investigating: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    dismissed: "bg-gray-100 text-gray-600 dark:bg-gray-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}
