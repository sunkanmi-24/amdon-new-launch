import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, KeyRound, Mail, CheckCircle, Loader2 } from "lucide-react";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email.trim()) { setError("Email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Sent confirmation ────────────────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <h1 className="font-heading font-bold text-base">AMDON Portal</h1>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm text-center space-y-5">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto">
              <Mail className="w-10 h-10 text-primary" />
            </div>

            <div className="space-y-2">
              <h2 className="font-heading text-2xl font-bold">Check your inbox</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                If an account exists for{" "}
                <span className="font-semibold text-foreground">{email}</span>,
                we've sent a 6-digit reset code. Enter it on the next page.
              </p>
            </div>

            <Link
              to={`/reset-password?email=${encodeURIComponent(email)}`}
            >
              <Button className="w-full h-11">
                Enter Reset Code
              </Button>
            </Link>

            <p className="text-xs text-muted-foreground">
              Didn't get it? Check your spam folder or{" "}
              <button
                onClick={() => setSent(false)}
                className="text-primary hover:underline"
              >
                try again
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Request form ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
          <h1 className="font-heading font-bold text-base">AMDON Portal</h1>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-bold">Forgot password?</h2>
              <p className="text-muted-foreground text-sm mt-1.5">
                Enter your registered email and we'll send you a reset code.
              </p>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <Button
              className="w-full h-11"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending code…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Send Reset Code
                </span>
              )}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

