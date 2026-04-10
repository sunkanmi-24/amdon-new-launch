import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AMDONlogo from "@/asset/images/AMDON-logo.png";
import {
  LayoutDashboard, Users, CreditCard, CalendarCheck, FileWarning,
  ShieldCheck, Settings, LogOut, Menu, X, ChevronRight,
  Bell, Moon, Sun, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import AdminOverview from "@/components/admin/AdminOverview";
import AdminMembers from "@/components/admin/AdminMembers";
import AdminRegistrationPayments from "@/components/admin/AdminRegistrationPayments";
import AdminYearlyDues from "@/components/admin/AdminYearlyDues";
import AdminReports from "@/components/admin/AdminReports";
import AdminRoles from "@/components/admin/AdminRoles";
import AdminApiTools from "@/components/admin/AdminApiTools";

type AdminSection =
  | "overview"
  | "members"
  | "reg-payments"
  | "yearly-dues"
  | "reports"
  | "roles"
  | "api-tools";

const NAV: { id: AdminSection; label: string; icon: React.ElementType; group: string }[] = [
  { id: "overview",      label: "Dashboard",      icon: LayoutDashboard, group: "main" },
  { id: "members",       label: "Members",         icon: Users,           group: "main" },
  { id: "reg-payments",  label: "Reg. Payments",   icon: CreditCard,      group: "finance" },
  { id: "yearly-dues",   label: "Yearly Dues",     icon: CalendarCheck,   group: "finance" },
  { id: "reports",       label: "Issue Reports",   icon: FileWarning,     group: "admin" },
  { id: "roles",         label: "Roles & Access",  icon: ShieldCheck,     group: "admin" },
  { id: "api-tools",     label: "API Tools",       icon: Settings,        group: "admin" },
];

const GROUPS = [
  { key: "main",    label: "Main" },
  { key: "finance", label: "Finance" },
  { key: "admin",   label: "Administration" },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [section, setSection] = useState<AdminSection>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────
  useEffect(() => {
    const secret = localStorage.getItem("amdon_admin_secret");
    if (!secret) {
      navigate("/admin/login", { replace: true });
      return;
    }
    const email = localStorage.getItem("amdon_admin_email") || "admin";
    setAdminEmail(email);
  }, [navigate]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const close = () => setUserMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [userMenuOpen]);

  const toggleDark = () => {
    setDark((d) => {
      document.documentElement.classList.toggle("dark", !d);
      return !d;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("amdon_admin_secret");
    localStorage.removeItem("amdon_admin_email");
    navigate("/admin/login", { replace: true });
  };

  const handleNav = (id: AdminSection) => {
    setSection(id);
    setSidebarOpen(false);
  };

  const sectionLabel = NAV.find((n) => n.id === section)?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-background flex font-body">

      {/* ── Mobile overlay ──────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-60 z-40 flex flex-col",
          "bg-card border-r border-border",
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:h-auto"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <img src={AMDONlogo} alt="AMDON" className="h-8 w-auto" />
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold text-sm leading-tight text-foreground truncate">
              AMDON Portal
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
              Admin Panel
            </p>
          </div>
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {GROUPS.map((group) => {
            const items = NAV.filter((n) => n.group === group.key);
            return (
              <div key={group.key}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-1.5">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {items.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => handleNav(id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                        section === id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">{label}</span>
                      {section === id && (
                        <ChevronRight className="h-3 w-3 opacity-70" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-border">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setUserMenuOpen((o) => !o); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary uppercase">
                  {adminEmail.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-foreground truncate">
                  {adminEmail}
                </p>
                <p className="text-[10px] text-muted-foreground">Super Admin</p>
              </div>
              <ChevronDown
                className={cn(
                  "h-3 w-3 text-muted-foreground transition-transform duration-200",
                  userMenuOpen && "rotate-180"
                )}
              />
            </button>

            {userMenuOpen && (
              <div
                className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-sm border-b border-border px-4 lg:px-6 h-14 flex items-center gap-3 shrink-0">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground p-1"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground hidden sm:inline">Admin</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline" />
            <span className="font-semibold text-foreground">{sectionLabel}</span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={toggleDark}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <div className="hidden sm:flex items-center gap-1.5 ml-1 px-2.5 py-1 bg-primary/10 rounded-full">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-primary">Live</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 animate-fade-in">
          {section === "overview"     && <AdminOverview onNavigate={setSection} />}
          {section === "members"      && <AdminMembers />}
          {section === "reg-payments" && <AdminRegistrationPayments />}
          {section === "yearly-dues"  && <AdminYearlyDues />}
          {section === "reports"      && <AdminReports />}
          {section === "roles"        && <AdminRoles />}
          {section === "api-tools"    && <AdminApiTools />}
        </main>
      </div>
    </div>
  );
}
