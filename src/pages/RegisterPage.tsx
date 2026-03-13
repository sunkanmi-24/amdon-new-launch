import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StepIndicator from "@/components/StepIndicator";
import StepOneBioForm from "@/components/StepOneBioForm";
import StepTwoLocationForm from "@/components/StepTwoLocationForm";
import StepThreeContactForm from "@/components/StepThreeContactForm";
import { StepOneBio, StepTwoLocation, StepThreeContact } from "@/types/registration";
import { submitRegistration, createLoginAccount, uploadPhoto, login } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { toast } from "sonner";
import { CheckCircle, Copy, ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";


const STEP_LABELS = ["Personal Info", "Location & Business", "Contact Details"];

// ─── Success Screen ────────────────────────────────────────────────

interface SuccessScreenProps {
  memberId: string;
  email: string;
  fullName: string;
}

const SuccessScreen = ({ memberId, email, fullName }: SuccessScreenProps) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [errors, setErrors] = useState({ password: "", confirm: "" });

  const copyId = () => {
    navigator.clipboard.writeText(memberId);
    toast.success("Member ID copied to clipboard");
  };

  const handleCreateAccount = async () => {
    const e = { password: "", confirm: "" };
    if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (password !== confirmPassword) e.confirm = "Passwords do not match";
    setErrors(e);
    if (e.password || e.confirm) return;

    setIsCreating(true);
    try {
      // 1. Create login account
    await createLoginAccount(email, password, memberId, fullName);
     toast.success("Account created! Please verify your email.");
setAccountCreated(true);
setTimeout(() => {
  navigate(
    `/verify-email?email=${encodeURIComponent(email)}&name=${encodeURIComponent(fullName)}`
  );
}, 1500);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Success Card */}
        <Card className="border-0 shadow-xl overflow-hidden">
          {/* Top banner */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-3">
              <CheckCircle className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-white font-heading text-2xl font-bold">Registration Complete!</h2>
            <p className="text-green-100 text-sm mt-1">You're now part of the AMDON network</p>
          </div>

          <CardContent className="p-6 space-y-5">
            {/* Member ID display */}
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your Member ID</p>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-2xl font-bold text-primary">{memberId}</span>
                <button
                  onClick={copyId}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="Copy ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              A confirmation email has been sent to <strong>{email}</strong> with your Member ID.
            </p>
          </CardContent>
        </Card>

        {/* Create login account */}
        {!accountCreated && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Create Your Login Password</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                Set a password to access your member dashboard anytime.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Password</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Confirm Password</Label>
                <Input
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10"
                />
                {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
              </div>

              <Button
                className="w-full h-10"
                onClick={handleCreateAccount}
                disabled={isCreating}
              >
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Setting up account…
                  </span>
                ) : (
                  "Create Account & Go to Dashboard"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Already have a password?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        )}

        {accountCreated && (
          <div className="text-center text-sm text-muted-foreground animate-pulse">
            Redirecting to your dashboard…
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main RegisterPage ────────────────────────────────────────────

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ memberId: string; email: string; fullName: string } | null>(null);

  const [bio, setBio] = useState<StepOneBio>({
    firstName: "", middleName: "", lastName: "",
    dateOfBirth: "", gender: "", nationality: "Nigerian",
    occupation: "", photoFile: null,
  });

  const [location, setLocation] = useState<StepTwoLocation>({
    state: "", lga: "", fullAddress: "",
    dealershipName: "", dealershipCategory: "",
    yearsInOperation: "", dealershipDescription: "",
  });

  const [contact, setContact] = useState<StepThreeContact>({
    phone1: "", phone2: "", email: "",
    nokName: "", nokPhone: "", referralSource: "",
  });

  const validateStep1 = useCallback(() => {
    const e: Record<string, string> = {};
    if (!bio.firstName.trim()) e.firstName = "Required";
    if (!bio.lastName.trim()) e.lastName = "Required";
    if (!bio.dateOfBirth) e.dateOfBirth = "Required";
    if (!bio.gender) e.gender = "Required";
    if (!bio.nationality.trim()) e.nationality = "Required";
    if (!bio.occupation.trim()) e.occupation = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [bio]);

  const validateStep2 = useCallback(() => {
    const e: Record<string, string> = {};
    if (!location.state) e.state = "Required";
    if (!location.lga) e.lga = "Required";
    if (!location.fullAddress.trim()) e.fullAddress = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [location]);

  const validateStep3 = useCallback(() => {
    const e: Record<string, string> = {};
    if (!contact.phone1.trim()) e.phone1 = "Required";
    if (!contact.email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) e.email = "Invalid email";
    if (!contact.nokName.trim()) e.nokName = "Required";
    if (!contact.nokPhone.trim()) e.nokPhone = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [contact]);

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setIsSubmitting(true);

    try {
      // Upload photo first if provided
      let photoUrl: string | undefined;
      if (bio.photoFile) {
        try {
          photoUrl = await uploadPhoto(bio.photoFile);
        } catch {
          toast.error("Photo upload failed — continuing without photo");
        }
      }

      // Submit registration to backend
      const registrationResult = await submitRegistration({
        firstName: bio.firstName,
        middleName: bio.middleName || undefined,
        lastName: bio.lastName,
        dateOfBirth: bio.dateOfBirth,
        gender: bio.gender,
        nationality: bio.nationality,
        occupation: bio.occupation,
        photoUrl,
        state: location.state,
        lga: location.lga,
        fullAddress: location.fullAddress,
        dealershipName: location.dealershipName || undefined,
        dealershipCategory: location.dealershipCategory || undefined,
        yearsInOperation: location.yearsInOperation || undefined,
        businessDescription: location.dealershipDescription || undefined,
        phonePrimary: contact.phone1,
        phoneSecondary: contact.phone2 || undefined,
        email: contact.email,
        nokName: contact.nokName,
        nokPhone: contact.nokPhone,
        referralSource: contact.referralSource || undefined,
      });

      toast.success("Registration successful!");
      setResult({ memberId: registrationResult.memberId, email: contact.email, fullName: `${bio.firstName} ${bio.lastName}` });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success screen after successful registration
  if (result) {
    return <SuccessScreen 
    memberId={result.memberId}
     email={result.email} 
     fullName={result.fullName}
     />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading font-bold text-lg">Member Registration</h1>
            <p className="text-xs text-muted-foreground">Step {step} of 3</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <StepIndicator currentStep={step} totalSteps={3} labels={STEP_LABELS} />

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{STEP_LABELS[step - 1]}</CardTitle>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <StepOneBioForm
                data={bio}
                onChange={setBio}
                onNext={() => validateStep1() && setStep(2)}
                errors={errors}
              />
            )}
            {step === 2 && (
              <StepTwoLocationForm
                data={location}
                onChange={setLocation}
                onNext={() => validateStep2() && setStep(3)}
                onBack={() => { setErrors({}); setStep(1); }}
                errors={errors}
              />
            )}
            {step === 3 && (
              <StepThreeContactForm
                data={contact}
                onChange={setContact}
                onBack={() => { setErrors({}); setStep(2); }}
                onSubmit={handleSubmit}
                errors={errors}
                isSubmitting={isSubmitting}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;