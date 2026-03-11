import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StepTwoLocation } from "@/types/registration";
import { nigerianStates, dealershipCategories } from "@/data/nigerianStates";

interface Props {
  data: StepTwoLocation;
  onChange: (data: StepTwoLocation) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string>;
}

const StepTwoLocationForm = ({ data, onChange, onNext, onBack, errors }: Props) => {
  const update = (field: keyof StepTwoLocation, value: string) => {
    const newData = { ...data, [field]: value };
    if (field === "state") newData.lga = "";
    onChange(newData);
  };

  const lgas = useMemo(() => {
    const state = nigerianStates.find((s) => s.name === data.state);
    return state?.lgas || [];
  }, [data.state]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>State *</Label>
          <Select value={data.state} onValueChange={(v) => update("state", v)}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>
              {nigerianStates.map((s) => (
                <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.state && <p className="text-destructive text-xs">{errors.state}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Local Government Area *</Label>
          <Select value={data.lga} onValueChange={(v) => update("lga", v)} disabled={!data.state}>
            <SelectTrigger><SelectValue placeholder={data.state ? "Select LGA" : "Select state first"} /></SelectTrigger>
            <SelectContent>
              {lgas.map((lga) => (
                <SelectItem key={lga} value={lga}>{lga}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.lga && <p className="text-destructive text-xs">{errors.lga}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fullAddress">Full Residential / Business Address *</Label>
        <Textarea id="fullAddress" value={data.fullAddress} onChange={(e) => update("fullAddress", e.target.value)} placeholder="Enter your full address" rows={3} />
        {errors.fullAddress && <p className="text-destructive text-xs">{errors.fullAddress}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="dealershipName">Dealership / Business Name</Label>
          <Input id="dealershipName" value={data.dealershipName} onChange={(e) => update("dealershipName", e.target.value)} placeholder="If applicable" />
        </div>
        <div className="space-y-1.5">
          <Label>Dealership Category</Label>
          <Select value={data.dealershipCategory} onValueChange={(v) => update("dealershipCategory", v)}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {dealershipCategories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="yearsOp">Years in Operation</Label>
          <Input id="yearsOp" type="number" min="0" value={data.yearsInOperation} onChange={(e) => update("yearsInOperation", e.target.value)} placeholder="e.g. 5" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dealerDesc">Brief Description (optional)</Label>
        <Textarea id="dealerDesc" value={data.dealershipDescription} onChange={(e) => update("dealershipDescription", e.target.value)} placeholder="Describe your dealership or business" rows={2} />
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext} className="min-w-[140px]">Next Step</Button>
      </div>
    </div>
  );
};

export default StepTwoLocationForm;
