import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { verifyEmail, resendVerification } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, ArrowLeft, RefreshCw, Loader2, ShieldCheck } from "lucide-react";

const RESEND_COOLDOWN = 60; // seconds

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email = searchParams.get("email") || "";
  const fullName = searchParams.get("name") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no email param
  useEffect(() => {
    if (!email) navigate("/register");
  }, [email, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept single digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError("");

    // Auto-advance
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 filled
    if (digit && index === 5 && newCode.every((d) => d !== "")) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && code.every((d) => d !== "")) {
      handleVerify(code.join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split("");
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (codeString: string) => {
    if (codeString.length !== 6) return;
    setIsVerifying(true);
    setError("");
    try {
      await verifyEmail(email, codeString);
      setVerified(true);
      toast.success("Email verified successfully!");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError((err as Error).message);
      // Clear code on error
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      await resendVerification(email, fullName);
      toast.success("A new code has been sent to your email.");
      setCooldown(RESEND_COOLDOWN);
      setCode(["", "", "", "", "", ""]);
      setError("");
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsResending(false);
    }
  };

  // ── Success Screen ─────────────────────────────────────────────
  if (verified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-5">
          {/* Animated checkmark */}
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              Email Verified!
            </h2>
            <p className="text-muted-foreground text-sm">
              Your email has been confirmed successfully.
              <br />
              Redirecting you to login…
            </p>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground text-xs justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Taking you to login in a moment
          </div>

          <Link to="/login">
            <Button className="w-full">Go to Login Now</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Verification Screen ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/register">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <h1 className="font-heading font-bold text-base">AMDON Portal</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          {/* Icon + heading */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-bold">Check your email</h2>
              <p className="text-muted-foreground text-sm mt-1.5">
                We sent a 6-digit code to
              </p>
              <p className="font-semibold text-sm text-primary">{email}</p>
            </div>
          </div>

          {/* OTP input */}
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-5">
            <div
              className="flex justify-center gap-2"
              onPaste={handlePaste}
            >
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
                  disabled={isVerifying}
                  className={`
                    w-11 h-14 text-center text-xl font-bold rounded-xl border-2 
                    bg-muted/30 outline-none transition-all
                    focus:border-primary focus:bg-background focus:shadow-md
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${error ? "border-destructive bg-destructive/5" : "border-border"}
                    ${digit ? "border-primary/60 bg-primary/5" : ""}
                  `}
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <p className="text-destructive text-xs text-center font-medium">
                {error}
              </p>
            )}

            {/* Verify button */}
            <Button
              className="w-full h-11"
              onClick={() => handleVerify(code.join(""))}
              disabled={code.some((d) => !d) || isVerifying}
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Verify Email
                </span>
              )}
            </Button>

            {/* Resend */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">
                Didn't receive the code?
              </p>
              <button
                onClick={handleResend}
                disabled={cooldown > 0 || isResending}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline flex items-center gap-1.5 mx-auto"
              >
                {isResending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            The code expires in <strong>10 minutes</strong>.
            <br />
            Check your spam folder if you don't see it.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;