import { useState, useEffect, useCallback } from "react";
import { getRegistrationPayments, recordRegistrationPayment, PaymentRecord } from "@/lib/adminApi";
import { PlusCircle, Loader2, AlertCircle, ChevronLeft, ChevronRight, DollarSign, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminRegistrationPayments() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [summary, setSummary] = useState({ totalPaid: 0, totalPending: 0, totalCount: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ memberId: "", amount: "", status: "paid", paymentMethod: "", reference: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRegistrationPayments({ page, limit: 20, status: statusFilter || undefined });
      setPayments(res.payments || []);
      setTotal(res.total);
      setTotalPages(Math.ceil(res.total / 20));
      setSummary(res.summary);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.memberId || !form.amount) {
      toast.error("Member ID and amount are required");
      return;
    }
    setSaving(true);
    try {
      await recordRegistrationPayment({
        memberId: form.memberId,
        amount: Number(form.amount),
        status: form.status,
        paymentMethod: form.paymentMethod || undefined,
        reference: form.reference || undefined,
      });
      toast.success("Payment recorded successfully");
      setShowAdd(false);
      setForm({ memberId: "", amount: "", status: "paid", paymentMethod: "", reference: "" });
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
          <h2 className="text-lg font-bold font-heading">Registration Payments</h2>
          <p className="text-sm text-muted-foreground">Payment log and breakdown</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Record Payment
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold">₦{(summary.totalPaid).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Collected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{summary.totalPending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{summary.totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Member ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Method</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Reference</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{p.member_id}</td>
                    <td className="px-4 py-3 font-semibold">₦{Number(p.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{p.payment_method || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{p.reference || "—"}</td>
                    <td className="px-4 py-3">
                      <PayStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No payment records found</td></tr>
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

      {/* Add Payment Dialog */}
      {showAdd && (
        <Dialog open onOpenChange={() => setShowAdd(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Registration Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Member ID *</Label>
                <Input className="h-9 text-sm mt-1" placeholder="AMDON-XX-2026-XXXX"
                  value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Amount (₦) *</Label>
                <Input className="h-9 text-sm mt-1" type="number" placeholder="0.00"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Input className="h-9 text-sm mt-1" placeholder="bank transfer, cash, etc."
                  value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Reference</Label>
                <Input className="h-9 text-sm mt-1" placeholder="Transaction reference"
                  value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleAdd} disabled={saving} className="flex-1">
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Record Payment
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function PayStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}
