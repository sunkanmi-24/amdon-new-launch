import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StepIndicator from "@/components/StepIndicator";
import StepOneBioForm from "@/components/StepOneBioForm";
import StepTwoLocationForm from "@/components/StepTwoLocationForm";
import StepThreeContactForm from "@/components/StepThreeContactForm";
import { StepOneBio, StepTwoLocation, StepThreeContact } from "@/types/registration";
import { nigerianStates } from "@/data/nigerianStates";
import { generateMemberId } from "@/lib/idGenerator";
import { addMember } from "@/lib/memberStore";
import { toast } from "sonner";
import { CheckCircle, Copy, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const STEP_LABELS = ["Personal Info", "Location & Business", "Contact Details"];

const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

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

    // Simulate server delay
    await new Promise((r) => setTimeout(r, 1500));

    const stateData = nigerianStates.find((s) => s.name === location.state);
    const stateCode = stateData?.code || "XX";
    const memberId = generateMemberId(stateCode);

    addMember({
      memberId,
      registeredAt: new Date().toISOString(),
      bio,
      location,
      contact,
    });

    setGeneratedId(memberId);
    setIsSubmitting(false);
    toast.success("Registration successful!");
  };

  const copyId = () => {
    if (generatedId) {
      navigator.clipboard.writeText(generatedId);
      toast.success("Member ID copied to clipboard");
    }
  };

  // Success screen
  if (generatedId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-5">
            <div className="w-16 h-16 rounded-full bg-success/10 mx-auto flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-bold mb-2">Registration Complete!</h2>
              <p className="text-muted-foreground text-sm">Your AMDON membership has been registered successfully.</p>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Your Member ID</p>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-xl font-bold text-primary">{generatedId}</span>
                <button onClick={copyId} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Please save your Member ID. You will need it to access your dashboard and verify your membership.</p>
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/dashboard">
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full">Back to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
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
