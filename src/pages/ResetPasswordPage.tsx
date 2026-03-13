
import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { resetPassword } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, KeyRound, Eye, EyeOff,
  CheckCircle, Loader2, ShieldCheck,
} from "lucide-react";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({ code: "", password: "", confirm: "" });

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) navigate("/forgot-password");
    inputRefs.current[0]?.focus();
  }, [email, navigate]);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setErrors((e) => ({ ...e, code: "" }));
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const validate = () => {
    const e = { code: "", password: "", confirm: "" };
    if (code.some((d) => !d)) e.code = "Please enter the full 6-digit code.";
    if (newPassword.length < 8) e.password = "Password must be at least 8 characters.";
    if (newPassword !== confirmPassword) e.confirm = "Passwords do not match.";
    setErrors(e);
    return !e.code && !e.password && !e.confirm;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      await resetPassword(email, code.join(""), newPassword);
      setSuccess(true);
      toast.success("Password reset successfully!");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setErrors((e) => ({ ...e, code: (err as Error).message }));
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success ──────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold">Password Reset!</h2>
            <p className="text-muted-foreground text-sm">
              Your password has been updated successfully.
              <br />
              Redirecting you to login…
            </p>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground text-xs justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Taking you to login
          </div>

          <Link to="/login">
            <Button className="w-full">Go to Login Now</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Reset form ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/forgot-password">
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
              <h2 className="font-heading text-2xl font-bold">Reset Password</h2>
              <p className="text-muted-foreground text-sm mt-1.5">
                Enter the code sent to{" "}
                <span className="font-semibold text-foreground">{email}</span>
                {" "}and your new password.
              </p>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-5">
            {/* Code input */}
            <div className="space-y-3">
              <Label className="text-sm">6-Digit Reset Code</Label>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={isLoading}
                    className={`
                      w-10 h-12 text-center text-lg font-bold rounded-xl border-2
                      bg-muted/30 outline-none transition-all
                      focus:border-primary focus:bg-background
                      disabled:opacity-50
                      ${errors.code ? "border-destructive" : "border-border"}
                      ${digit ? "border-primary/60 bg-primary/5" : ""}
                    `}
                  />
                ))}
              </div>
              {errors.code && (
                <p className="text-destructive text-xs text-center">{errors.code}</p>
              )}
            </div>

            {/* New password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-xs">{errors.password}</p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="h-11"
              />
              {errors.confirm && (
                <p className="text-destructive text-xs">{errors.confirm}</p>
              )}
            </div>

            <Button
              className="w-full h-11"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resetting password…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Reset Password
                </span>
              )}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Code not received?{" "}
            <Link to="/forgot-password" className="text-primary hover:underline">
              Request a new one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;