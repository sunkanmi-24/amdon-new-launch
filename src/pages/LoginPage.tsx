import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { login } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { toast } from "sonner";
import { ArrowLeft, LogIn, Eye, EyeOff, Shield } from "lucide-react";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Update handleLogin to handle EMAIL_NOT_VERIFIED response
const handleLogin = async () => {
  setError("");
  if (!email.trim() || !password.trim()) {
    setError("Email and password are required.");
    return;
  }

  setIsLoading(true);
  try {
    const result = await login(email.trim(), password);
    saveSession(result.accessToken, result.user);
    toast.success("Welcome back!");
    navigate("/dashboard");
  } catch (err) {
    const msg = (err as Error).message;
    // If email not verified — redirect to verify page
    if (msg.includes("Email not verified") || msg.includes("EMAIL_NOT_VERIFIED")) {
      toast.error("Please verify your email first.");
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}&name=Member`);
      return;
    }
    setError(msg);
  } finally {
    setIsLoading(false);
  }
};

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <h1 className="font-heading font-bold text-lg">AMDON Portal</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Icon */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-heading text-2xl font-bold">Member Login</h2>
            <p className="text-muted-foreground text-sm">
              Sign in to access your personal dashboard
            </p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6 space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg">
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
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                className="w-full h-11 text-base"
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" /> Sign In
                  </span>
                )}
              </Button>

<div className="text-right">
  <Link
    to="/forgot-password"
    className="text-xs text-muted-foreground hover:text-primary transition-colors"
  >
    Forgot password?
  </Link>
</div>

            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            Not registered yet?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Create your account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;