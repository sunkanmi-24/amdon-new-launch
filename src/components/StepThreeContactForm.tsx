import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StepThreeContact } from "@/types/registration";
import { referralSources } from "@/data/nigerianStates";
import { Loader2 } from "lucide-react";

interface Props {
  data: StepThreeContact;
  onChange: (data: StepThreeContact) => void;
  onBack: () => void;
  onSubmit: () => void;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

const StepThreeContactForm = ({ data, onChange, onBack, onSubmit, errors, isSubmitting }: Props) => {
  const update = (field: keyof StepThreeContact, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone1">Phone Number (Primary) *</Label>
          <Input id="phone1" type="tel" value={data.phone1} onChange={(e) => update("phone1", e.target.value)} placeholder="e.g. 08012345678" />
          {errors.phone1 && <p className="text-destructive text-xs">{errors.phone1}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone2">Phone (WhatsApp / Secondary)</Label>
          <Input id="phone2" type="tel" value={data.phone2} onChange={(e) => update("phone2", e.target.value)} placeholder="Optional" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email Address *</Label>
        <Input id="email" type="email" value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" />
        {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nokName">Next of Kin Name *</Label>
          <Input id="nokName" value={data.nokName} onChange={(e) => update("nokName", e.target.value)} placeholder="Full name" />
          {errors.nokName && <p className="text-destructive text-xs">{errors.nokName}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nokPhone">Next of Kin Phone *</Label>
          <Input id="nokPhone" type="tel" value={data.nokPhone} onChange={(e) => update("nokPhone", e.target.value)} placeholder="Phone number" />
          {errors.nokPhone && <p className="text-destructive text-xs">{errors.nokPhone}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>How did you hear about AMDON?</Label>
        <Select value={data.referralSource} onValueChange={(v) => update("referralSource", v)}>
          <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
          <SelectContent>
            {referralSources.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>Back</Button>
        <Button onClick={onSubmit} disabled={isSubmitting} className="min-w-[160px]">
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
          ) : (
            "Complete Registration"
          )}
        </Button>
      </div>
    </div>
  );
};

export default StepThreeContactForm;
