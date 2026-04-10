import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StepOneBio } from "@/types/registration";
import { Upload, User } from "lucide-react";

interface Props {
  data: StepOneBio;
  onChange: (data: StepOneBio) => void;
  onNext: () => void;
  errors: Record<string, string>;
}

const StepOneBioForm = ({ data, onChange, onNext, errors }: Props) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const update = (field: keyof StepOneBio, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange({ ...data, photoFile: file });
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-center mb-6">
        <label className="cursor-pointer group">
          <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border group-hover:border-primary transition-colors flex items-center justify-center overflow-hidden">
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <User className="w-8 h-8 mx-auto text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mt-1 block">Upload</span>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First Name *</Label>
          <Input id="firstName" value={data.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="First name" />
          {errors.firstName && <p className="text-destructive text-xs">{errors.firstName}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="middleName">Middle Name</Label>
          <Input id="middleName" value={data.middleName} onChange={(e) => update("middleName", e.target.value)} placeholder="Middle name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input id="lastName" value={data.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Last name" />
          {errors.lastName && <p className="text-destructive text-xs">{errors.lastName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="dob">Date of Birth *</Label>
          <Input id="dob" type="date" value={data.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
          {errors.dateOfBirth && <p className="text-destructive text-xs">{errors.dateOfBirth}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Gender *</Label>
          <Select value={data.gender} onValueChange={(v) => update("gender", v)}>
            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && <p className="text-destructive text-xs">{errors.gender}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nationality">Nationality *</Label>
          <Input id="nationality" value={data.nationality} onChange={(e) => update("nationality", e.target.value)} placeholder="e.g. Nigerian" />
          {errors.nationality && <p className="text-destructive text-xs">{errors.nationality}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="occupation">Occupation / Profession *</Label>
          <Input id="occupation" value={data.occupation} onChange={(e) => update("occupation", e.target.value)} placeholder="e.g. Auto dealer" />
          {errors.occupation && <p className="text-destructive text-xs">{errors.occupation}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} className="min-w-[140px]">
          Next Step
        </Button>
      </div>
    </div>
  );
};

export default StepOneBioForm;
