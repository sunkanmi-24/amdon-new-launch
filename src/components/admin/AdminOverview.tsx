import { useState, useEffect, useCallback } from "react";
import { getDashboard, DashboardData } from "@/lib/adminApi";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import {
  Users, TrendingUp, AlertCircle, CreditCard, MapPin,
  Loader2, RefreshCw, ArrowRight, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminSection = string;
interface Props { onNavigate: (s: AdminSection) => void; }

// ── Helpers ──────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

// ── Stat card ────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color, bg, onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  bg: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        "transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5", bg)}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold font-heading leading-none text-foreground">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Status badge ─────────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active:    "bg-emerald-500",
    pending:   "bg-amber-500",
    suspended: "bg-red-500",
    inactive:  "bg-gray-400",
  };
  return (
    <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", colors[status] ?? "bg-gray-400")} />
  );
}

// ── Main component ───────────────────────────────────────────────
export default function AdminOverview({ onNavigate }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getDashboard();
      setData(d);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Loading dashboard data…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }

  const topStates = data.registrationsByState.slice(0, 10);
  const topLGAs   = data.registrationsByLGA.slice(0, 10);
  const lastMonth = data.progressiveReport[data.progressiveReport.length - 1];
  const prevMonth = data.progressiveReport[data.progressiveReport.length - 2];
  const monthGrowth = prevMonth
    ? Math.round(((lastMonth?.count ?? 0) / Math.max(prevMonth.count, 1) - 1) * 100)
    : 0;

  return (
    <div className="space-y-5">

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Total Members"
          value={data.totalCount}
          sub="All registered"
          color="text-primary"
          bg="bg-primary/10"
        />
        <StatCard
          icon={TrendingUp}
          label="This Month"
          value={lastMonth?.count ?? 0}
          sub={monthGrowth >= 0 ? `+${monthGrowth}% vs last month` : `${monthGrowth}% vs last month`}
          color="text-emerald-600"
          bg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          icon={CreditCard}
          label="Unpaid Registrations"
          value={data.withoutPayments.length}
          sub="Pending payment"
          color="text-amber-600"
          bg="bg-amber-50 dark:bg-amber-900/20"
          onClick={() => onNavigate("reg-payments")}
        />
        <StatCard
          icon={MapPin}
          label="States Covered"
          value={data.registrationsByState.length}
          sub={`${data.registrationsByLGA.length} LGAs`}
          color="text-blue-600"
          bg="bg-blue-50 dark:bg-blue-900/20"
        />
      </div>

      {/* ── Progress charts ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Cumulative Registrations</CardTitle>
            <CardDescription className="text-xs">Total growth over time</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={data.progressiveReport} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(145,78%,22%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(145,78%,22%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="hsl(145,78%,22%)"
                  fill="url(#cumGrad)"
                  strokeWidth={2}
                  name="Total Members"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Monthly Registrations</CardTitle>
            <CardDescription className="text-xs">New members per month</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={data.progressiveReport} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                />
                <Bar dataKey="count" fill="hsl(42,87%,55%)" radius={[4, 4, 0, 0]} name="New Members" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── State + LGA breakdown ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Registrations by State</CardTitle>
            <CardDescription className="text-xs">Top {topStates.length} states</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={Math.max(topStates.length * 32 + 40, 200)}>
              <BarChart data={topStates} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="state" tick={{ fontSize: 10 }} width={88} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                />
                <Bar dataKey="count" fill="hsl(145,78%,22%)" radius={[0, 4, 4, 0]} name="Members" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Registrations by LGA</CardTitle>
            <CardDescription className="text-xs">Top {topLGAs.length} LGAs</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={Math.max(topLGAs.length * 32 + 40, 200)}>
              <BarChart data={topLGAs} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="lga" tick={{ fontSize: 10 }} width={88} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                />
                <Bar dataKey="count" fill="hsl(210,80%,55%)" radius={[0, 4, 4, 0]} name="Members" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Last 10 registrations ───────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Registrations</CardTitle>
              <CardDescription className="text-xs">Last 10 members registered</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-primary hover:text-primary"
              onClick={() => onNavigate("members")}
            >
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="divide-y divide-border">
            {data.lastTen.map((m) => (
              <div
                key={m.member_id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
              >
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {m.member_bio?.photo_url ? (
                    <img
                      src={m.member_bio.photo_url}
                      alt=""
                      className="h-9 w-9 object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-primary">
                      {(m.member_bio?.first_name?.[0] ?? "")}
                      {(m.member_bio?.last_name?.[0] ?? "")}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {m.member_bio?.first_name} {m.member_bio?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {m.member_id} · {m.member_location?.state}
                  </p>
                </div>

                {/* Right */}
                <div className="text-right shrink-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 justify-end">
                    <StatusDot status={m.account_status} />
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {m.account_status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDate(m.created_at)}
                  </p>
                </div>
              </div>
            ))}
            {data.lastTen.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No registrations yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Registrations without payment ───────────────────── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mt-0.5 shrink-0">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  Registrations Without Payment
                </CardTitle>
                <CardDescription className="text-xs">
                  {data.withoutPayments.length} member{data.withoutPayments.length !== 1 ? "s" : ""} pending payment
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-primary hover:text-primary shrink-0"
              onClick={() => onNavigate("reg-payments")}
            >
              Manage <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {data.withoutPayments.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              ✓ All registered members have paid
            </p>
          ) : (
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {data.withoutPayments.slice(0, 25).map((m) => {
                const days = daysSince(m.created_at);
                return (
                  <div
                    key={m.member_id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50/60 dark:hover:bg-amber-900/10 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        {(m.member_bio?.first_name?.[0] ?? "")}
                        {(m.member_bio?.last_name?.[0] ?? "")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {m.member_bio?.first_name} {m.member_bio?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.member_id} · {m.member_contact?.email}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{m.member_location?.state}</p>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <Clock className="h-3 w-3 text-amber-500" />
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          {days}d pending
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {data.withoutPayments.length > 25 && (
                <p className="px-4 py-2.5 text-xs text-muted-foreground text-center">
                  +{data.withoutPayments.length - 25} more — view all in Reg. Payments
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
