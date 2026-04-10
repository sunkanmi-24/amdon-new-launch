import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AMDONlogo from "@/asset/images/AMDON-logo.png";
import { Shield, Eye, EyeOff, Loader2, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BASE_URL = import.meta.env.VITE_API_URL || "https://amdon-backened.vercel.app/api";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!secret.trim()) {
      setError("Please enter your admin secret key.");
      return;
    }

    setLoading(true);

    try {
      // Validate the secret against the backend
      const res = await fetch(`${BASE_URL}/admin/dashboard`, {
        method: "GET",
        headers: {
          "x-admin-secret": secret.trim(),
          "Content-Type": "application/json",
        },
      });

      if (res.status === 403 || res.status === 401) {
        setError("Invalid admin secret. Please try again.");
        return;
      }

      if (!res.ok) {
        setError("Server error. Please try again later.");
        return;
      }

      // Secret accepted — persist credentials
      localStorage.setItem("amdon_admin_secret", secret.trim());
      if (email.trim()) {
        localStorage.setItem("amdon_admin_email", email.trim().toLowerCase());
      }

      navigate("/admin", { replace: true });
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo + badge */}
        <div className="flex flex-col items-center gap-3">
          <img src={AMDONlogo} alt="AMDON" className="h-14 w-auto" />
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full">
            <Shield className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold tracking-wide uppercase">
              Admin Access
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold font-heading text-foreground">
              Sign in to Admin Panel
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your credentials to access the AMDON admin dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email (optional — stored for display) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Admin Email <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                type="email"
                placeholder="admin@amdon.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-sm"
                autoComplete="email"
              />
            </div>

            {/* Secret key */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Admin Secret Key <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder="Enter secret key…"
                  value={secret}
                  onChange={(e) => { setSecret(e.target.value); setError(null); }}
                  className="pl-9 pr-10 h-10 text-sm"
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showSecret
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 font-semibold"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying…</>
              ) : (
                <><Shield className="h-4 w-4 mr-2" /> Access Dashboard</>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Not an admin?{" "}
          <a href="/login" className="text-primary hover:underline font-medium">
            Member login
          </a>
        </p>
      </div>
    </div>
  );
}
