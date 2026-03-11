import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMembers } from "@/lib/memberStore";
import { MemberRecord } from "@/types/registration";
import { ArrowLeft, Lock, User, CalendarDays, MapPin, Phone, Mail, Building2, Edit, Save } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DashboardPage = () => {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [selected, setSelected] = useState<MemberRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{ phone1: string; phone2: string; email: string; fullAddress: string; dealershipDescription: string }>({
    phone1: "", phone2: "", email: "", fullAddress: "", dealershipDescription: "",
  });

  useEffect(() => {
    const all = getMembers();
    setMembers(all);
    if (all.length > 0) {
      setSelected(all[all.length - 1]); // show most recent
    }
  }, []);

  useEffect(() => {
    if (selected) {
      setEditData({
        phone1: selected.contact.phone1,
        phone2: selected.contact.phone2,
        email: selected.contact.email,
        fullAddress: selected.location.fullAddress,
        dealershipDescription: selected.location.dealershipDescription,
      });
    }
  }, [selected]);

  const handleSave = () => {
    if (!selected) return;
    // In production, this would update Supabase
    toast.success("Profile updated successfully");
    setIsEditing(false);
  };

  if (members.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <h1 className="font-heading font-bold text-lg">Member Dashboard</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center max-w-md">
          <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="font-heading text-xl font-bold mb-2">No Members Yet</h2>
          <p className="text-muted-foreground mb-6">Register first to access your dashboard.</p>
          <Link to="/register"><Button>Register Now</Button></Link>
        </div>
      </div>
    );
  }

  const m = selected!;
  const fullName = [m.bio.firstName, m.bio.middleName, m.bio.lastName].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <h1 className="font-heading font-bold text-lg">Member Dashboard</h1>
          </div>
          {members.length > 1 && (
            <select
              className="text-sm border rounded-md px-2 py-1 bg-background"
              value={m.memberId}
              onChange={(e) => setSelected(members.find((x) => x.memberId === e.target.value) || null)}
            >
              {members.map((mem) => (
                <option key={mem.memberId} value={mem.memberId}>{mem.memberId}</option>
              ))}
            </select>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Profile Header */}
        <Card>
          <div className="bg-primary p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-primary-foreground font-heading font-bold text-xl">{fullName}</h2>
              <Badge variant="secondary" className="font-mono mt-1">{m.memberId}</Badge>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              Registered on {new Date(m.registeredAt).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}
            </div>
          </CardContent>
        </Card>

        {/* Locked Fields */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" /> Non-Editable Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Full Name", value: fullName },
              { label: "Date of Birth", value: m.bio.dateOfBirth },
              { label: "Gender", value: m.bio.gender },
              { label: "State", value: m.location.state },
              { label: "LGA", value: m.location.lga },
              { label: "Member ID", value: m.memberId },
            ].map((f) => (
              <Tooltip key={f.label}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2.5 cursor-not-allowed">
                    <div>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-sm font-medium">{f.value}</p>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Contact admin to update this information</TooltipContent>
              </Tooltip>
            ))}
          </CardContent>
        </Card>

        {/* Editable Fields */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Editable Information</CardTitle>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-3.5 h-3.5 mr-1.5" /> Save
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Primary Phone</Label>
                <Input disabled={!isEditing} value={editData.phone1} onChange={(e) => setEditData({ ...editData, phone1: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Secondary / WhatsApp</Label>
                <Input disabled={!isEditing} value={editData.phone2} onChange={(e) => setEditData({ ...editData, phone2: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email Address</Label>
              <Input disabled={!isEditing} value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Full Address</Label>
              <Input disabled={!isEditing} value={editData.fullAddress} onChange={(e) => setEditData({ ...editData, fullAddress: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dealership Description</Label>
              <Input disabled={!isEditing} value={editData.dealershipDescription} onChange={(e) => setEditData({ ...editData, dealershipDescription: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
