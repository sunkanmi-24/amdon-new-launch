import { MemberRecord } from "@/types/registration";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Phone, Mail, Building2, Calendar } from "lucide-react";

interface Props {
  member: MemberRecord;
  compact?: boolean;
}

const MemberProfileCard = ({ member, compact = false }: Props) => {
  const { bio, location, contact, memberId, registeredAt } = member;
  const fullName = [bio.firstName, bio.middleName, bio.lastName].filter(Boolean).join(" ");

  return (
    <Card className="overflow-hidden">
      <div className="bg-primary px-6 py-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
          {member.photoUrl ? (
            <img src={member.photoUrl} alt={fullName} className="w-full h-full rounded-full object-cover" />
          ) : (
            <User className="w-7 h-7 text-primary-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-primary-foreground font-heading font-bold text-lg truncate">{fullName}</h3>
          <Badge variant="secondary" className="mt-1 font-mono text-xs">{memberId}</Badge>
        </div>
      </div>

      <CardContent className={`${compact ? "p-4" : "p-6"} space-y-4`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="Registered" value={new Date(registeredAt).toLocaleDateString()} />
          <InfoRow icon={<MapPin className="w-4 h-4" />} label="Location" value={`${location.lga}, ${location.state}`} />
          <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={contact.phone1} />
          <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={contact.email} />
          {location.dealershipName && (
            <InfoRow icon={<Building2 className="w-4 h-4" />} label="Business" value={location.dealershipName} />
          )}
          {!compact && (
            <>
              <InfoRow icon={<User className="w-4 h-4" />} label="Gender" value={bio.gender} />
              <InfoRow icon={<User className="w-4 h-4" />} label="Occupation" value={bio.occupation} />
            </>
          )}
        </div>

        {!compact && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1">Address</p>
            <p className="text-sm">{location.fullAddress}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium truncate">{value}</p>
    </div>
  </div>
);

export default MemberProfileCard;
