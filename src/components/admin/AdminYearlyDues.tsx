import { useState, useEffect, useCallback } from "react";
import { getYearlyDues, recordYearlyDue, YearlyDuesData } from "@/lib/adminApi";
import { PlusCircle, Loader2, AlertCircle, ChevronDown, ChevronRight, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminYearlyDues() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<YearlyDuesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedState, setExpandedState] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ memberId: "", year: String(currentYear), amount: "", status: "paid", paymentMethod: "", reference: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getYearlyDues(year);
      setData(res);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.memberId) { toast.error("Member ID is required"); return; }
    setSaving(true);
    try {
      await recordYearlyDue({
        memberId: form.memberId,
        year: Number(form.year),
        amount: form.amount ? Number(form.amount) : undefined,
        status: form.status,
        paymentMethod: form.paymentMethod || undefined,
        reference: form.reference || undefined,
      });
      toast.success("Yearly due recorded");
      setShowAdd(false);
      setForm({ memberId: "", year: String(currentYear), amount: "", status: "paid", paymentMethod: "", reference: "" });
      load();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold font-heading">Yearly Dues</h2>
          <p className="text-sm text-muted-foreground">Annual dues tracking with defaulter breakdown</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="h-9 w-28 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Record Due
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button size="sm" onClick={load}>Retry</Button>
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-4">
              <p className="text-2xl font-bold">{data.totalMembers}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Members</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-2xl font-bold text-emerald-600">{data.totalPaid}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Paid {year}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-2xl font-bold text-red-600">{data.totalDefaulters}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Defaulters</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-2xl font-bold text-amber-600">
                {data.totalMembers > 0 ? Math.round((data.totalPaid / data.totalMembers) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Compliance Rate</p>
            </CardContent></Card>
          </div>

          {/* Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Payment Progress {year}</p>
                <p className="text-sm text-muted-foreground">
                  {data.totalPaid} / {data.totalMembers}
                </p>
              </div>
              <Progress
                value={data.totalMembers > 0 ? (data.totalPaid / data.totalMembers) * 100 : 0}
                className="h-3"
              />
            </CardContent>
          </Card>

          {/* Defaulters by state chart */}
          {data.stateBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Defaulters by State</CardTitle>
                <CardDescription className="text-xs">{year} yearly dues — unpaid members per state</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.stateBreakdown.slice(0, 15)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="state" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" fill="hsl(0,84%,60%)" radius={[0, 4, 4, 0]} name="Defaulters" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Expandable state breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Defaulters Breakdown</CardTitle>
              <CardDescription className="text-xs">Click a state to see member list</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {data.stateBreakdown.map(({ state, count, members }) => (
                  <div key={state}>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                      onClick={() => setExpandedState(expandedState === state ? null : state)}
                    >
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-sm font-medium">{state}</span>
                      <span className="text-sm font-bold text-red-600">{count} defaulter{count !== 1 ? "s" : ""}</span>
                      {expandedState === state
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {expandedState === state && (
                      <div className="bg-muted/20 border-t border-border px-4 py-3 space-y-2">
                        {members.slice(0, 20).map((m) => (
                          <div key={m.member_id} className="flex items-center gap-3 text-sm">
                            <span className="font-mono text-xs text-muted-foreground w-36 shrink-0">{m.member_id}</span>
                            <span className="font-medium">{m.member_bio?.first_name} {m.member_bio?.last_name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{m.member_contact?.email}</span>
                          </div>
                        ))}
                        {members.length > 20 && (
                          <p className="text-xs text-muted-foreground">and {members.length - 20} more…</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {data.stateBreakdown.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    All members have paid their {year} dues ✓
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Add Dialog */}
      {showAdd && (
        <Dialog open onOpenChange={() => setShowAdd(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Record Yearly Due</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Member ID *</Label>
                <Input className="h-9 text-sm mt-1" placeholder="AMDON-XX-2026-XXXX"
                  value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Year *</Label>
                  <Input className="h-9 text-sm mt-1" type="number" value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Amount (₦)</Label>
                  <Input className="h-9 text-sm mt-1" type="number" placeholder="0.00"
                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="waived">Waived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Input className="h-9 text-sm mt-1" placeholder="cash, transfer, etc."
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
                  Record Due
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
