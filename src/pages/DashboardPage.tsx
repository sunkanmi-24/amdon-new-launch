import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getMyProfile,
  updateContact,
  updateAddress,
  uploadPhoto,
  updatePhoto,
  MemberProfile,
} from "@/lib/api";
  import AMDONlogo from "@/asset/images/AMDON-logo.png"; 
import { clearSession, isLoggedIn } from "@/lib/auth";
import { toast } from "sonner";
import {
  User, Lock, Phone, MapPin, Building2,
  Edit3, Save, X, LogOut, Copy, CheckCircle,
  CalendarDays, Briefcase, Users,
  AlertCircle, Loader2, Camera, ImagePlus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────
type EditSection = "contact" | "address" | null;

// ─── Helpers ─────────────────────────────────────────────────────────
function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    year: "numeric", month: "long", day: "numeric",
  });
}
function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// ─── Photo Upload Hook ────────────────────────────────────────────────
function usePhotoUpload(
  currentUrl: string | null,
  onSuccess: (url: string) => void
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Sync preview if parent profile reloads
  useEffect(() => { setPreview(currentUrl); }, [currentUrl]);

  const triggerPicker = () => inputRef.current?.click();

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Client-side validation
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        toast.error("Only JPEG, PNG, or WebP images are allowed");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5 MB");
        return;
      }

      // Show local preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setIsUploading(true);
      setUploadProgress(0);

      // Fake smooth progress while uploading
      const ticker = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 8, 85));
      }, 120);

      try {
        // 1. Upload to Supabase Storage
        const photoUrl = await uploadPhoto(file);
        // 2. Save URL to member_bio table
        await updatePhoto(photoUrl);

        clearInterval(ticker);
        setUploadProgress(100);
        setPreview(photoUrl);
        onSuccess(photoUrl);
        toast.success("Profile photo updated!");
      } catch (err) {
        clearInterval(ticker);
        setPreview(currentUrl); // revert preview
        toast.error((err as Error).message || "Photo upload failed");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        // Reset input so same file can be re-selected
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [currentUrl, onSuccess]
  );

  return { inputRef, preview, isUploading, uploadProgress, triggerPicker, handleFileChange };
}

// ─── Avatar with Upload Overlay ──────────────────────────────────────
interface AvatarUploadProps {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  onPhotoUpdated: (url: string) => void;
}

const AvatarUpload = ({ firstName, lastName, photoUrl, onPhotoUpdated }: AvatarUploadProps) => {
  const { inputRef, preview, isUploading, uploadProgress, triggerPicker, handleFileChange } =
    usePhotoUpload(photoUrl, onPhotoUpdated);

  return (
    <div className="relative shrink-0 group">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Avatar image / initials */}
      <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/30 relative">
        {preview ? (
          <img
            src={preview}
            alt="Profile"
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isUploading && "opacity-40"
            )}
          />
        ) : (
          <div className="w-full h-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-heading font-bold text-2xl">
              {getInitials(firstName, lastName)}
            </span>
          </div>
        )}

        {/* Upload progress ring overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
            <span className="text-white text-[10px] mt-1 font-semibold">
              {uploadProgress}%
            </span>
          </div>
        )}
      </div>

      {/* Camera button — visible on hover or always on mobile */}
      <button
        onClick={triggerPicker}
        disabled={isUploading}
        title="Change profile photo"
        className={cn(
          "absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full",
          "bg-white text-primary shadow-lg border border-primary/20",
          "flex items-center justify-center transition-all duration-200",
          "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
          "hover:scale-110 active:scale-95",
          isUploading && "pointer-events-none opacity-50"
        )}
      >
        <Camera className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ─── Info Row ─────────────────────────────────────────────────────────
const InfoRow = ({
  label, value, locked,
}: {
  label: string; value: string | null | undefined; locked?: boolean;
}) => (
  <div
    className={cn(
      "flex items-start justify-between gap-4 px-4 py-3 rounded-xl transition-colors",
      locked
        ? "bg-muted/60 cursor-not-allowed"
        : "bg-muted/30 hover:bg-muted/50"
    )}
  >
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold truncate">{value || "—"}</p>
    </div>
    {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />}
  </div>
);

// ─── Section Card ─────────────────────────────────────────────────────
const SectionCard = ({
  title, icon, children, action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
    <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <h3 className="font-heading font-semibold text-sm">{title}</h3>
      </div>
      {action}
    </div>
    <div className="p-4 space-y-2">{children}</div>
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────
const StatCard = ({
  value, label, icon,
}: {
  value: string; label: string; icon: React.ReactNode;
}) => (
  <div className="rounded-2xl p-4 flex items-center gap-3 border bg-card">
    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
      {icon}
    </div>
    <div>
      <p className="font-heading font-bold text-lg leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  </div>
);

// ─── Main DashboardPage ───────────────────────────────────────────────
const DashboardPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [editSection, setEditSection] = useState<EditSection>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  const [editContact, setEditContact] = useState({
    phonePrimary: "", phoneSecondary: "", email: "", nokName: "", nokPhone: "",
  });
  const [editAddress, setEditAddress] = useState({
    fullAddress: "", businessDescription: "",
  });

  // ── Auth guard
  useEffect(() => {
    if (!isLoggedIn()) navigate("/login", { replace: true });
  }, [navigate]);

  // ── Fetch profile
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await getMyProfile();
        setProfile(data);
        setEditContact({
          phonePrimary: data.contact.phone_primary,
          phoneSecondary: data.contact.phone_secondary || "",
          email: data.contact.email,
          nokName: data.contact.nok_name,
          nokPhone: data.contact.nok_phone,
        });
        setEditAddress({
          fullAddress: data.location.full_address,
          businessDescription: data.location.business_description || "",
        });
      } catch (err) {
        setFetchError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    clearSession();
    toast.success("Logged out");
    navigate("/");
  };

  const copyMemberId = () => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.memberId);
    setIdCopied(true);
    toast.success("Member ID copied");
    setTimeout(() => setIdCopied(false), 2000);
  };

  // Called when photo upload succeeds — update profile state
  const handlePhotoUpdated = useCallback((url: string) => {
    setProfile((prev) =>
      prev ? { ...prev, bio: { ...prev.bio, photo_url: url } } : prev
    );
  }, []);

  const handleSaveContact = async () => {
    setIsSaving(true);
    try {
      await updateContact({
        phonePrimary: editContact.phonePrimary,
        phoneSecondary: editContact.phoneSecondary || undefined,
        email: editContact.email,
        nokName: editContact.nokName,
        nokPhone: editContact.nokPhone,
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              contact: {
                ...prev.contact,
                phone_primary: editContact.phonePrimary,
                phone_secondary: editContact.phoneSecondary || null,
                email: editContact.email,
                nok_name: editContact.nokName,
                nok_phone: editContact.nokPhone,
              },
            }
          : prev
      );
      toast.success("Contact info updated");
      setEditSection(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    setIsSaving(true);
    try {
      await updateAddress({
        fullAddress: editAddress.fullAddress,
        businessDescription: editAddress.businessDescription || undefined,
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              location: {
                ...prev.location,
                full_address: editAddress.fullAddress,
                business_description: editAddress.businessDescription || null,
              },
            }
          : prev
      );
      toast.success("Address updated");
      setEditSection(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Error
  if (fetchError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="font-heading font-bold text-xl">Could not load profile</h2>
          <p className="text-sm text-muted-foreground">{fetchError}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate("/login")}>Sign in again</Button>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const p = profile;
  const fullName = [p.bio.first_name, p.bio.middle_name, p.bio.last_name]
    .filter(Boolean).join(" ");
  const days = daysSince(p.registrationDate);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img src={AMDONlogo} alt="AMDON Logo" className="h-8 w-auto object contain"  />
            </Link>
            <span className="font-heading font-bold text-sm hidden sm:block">
              ccfDashboard
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-5">
        {/* ── Hero / Profile Card ──────────────────────────── */}
        <div className="rounded-2xl overflow-hidden shadow-lg border">
          {/* Gradient banner */}
          <div className="bg-gradient-to-br from-primary via-primary/90 to-blue-700 p-6">
            <div className="flex items-start gap-4">
              {/* Avatar with upload */}
              <AvatarUpload
                firstName={p.bio.first_name}
                lastName={p.bio.last_name}
                photoUrl={p.bio.photo_url}
                onPhotoUpdated={handlePhotoUpdated}
              />

              {/* Name & ID */}
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-heading font-bold text-xl leading-tight truncate">
                  {fullName}
                </h2>
                <p className="text-blue-100 text-sm mt-0.5">{p.bio.occupation}</p>

                {/* Member ID badge */}
                <button
                  onClick={copyMemberId}
                  className="mt-3 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors rounded-lg px-3 py-1.5 group"
                >
                  <span className="font-mono text-white text-xs font-semibold tracking-wide">
                    {p.memberId}
                  </span>
                  {idCopied ? (
                    <CheckCircle className="w-3 h-3 text-green-300" />
                  ) : (
                    <Copy className="w-3 h-3 text-blue-200 group-hover:text-white transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Photo upload hint — shows only when no photo */}
            {!p.bio.photo_url && (
              <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5">
                <ImagePlus className="w-4 h-4 text-blue-100 shrink-0" />
                <p className="text-blue-100 text-xs">
                  Tap the camera icon on your avatar to add a profile photo
                </p>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="bg-card px-5 py-3 flex items-center justify-between border-t">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium capitalize text-green-600">
                {p.accountStatus}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="w-3.5 h-3.5" />
              Member since {formatDate(p.registrationDate)}
            </div>
          </div>
        </div>

        {/* ── Stats Row ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            value={`${days}d`}
            label="Days as Member"
            icon={<CalendarDays className="w-5 h-5" />}
          />
          <StatCard
            value={p.location.state}
            label="State"
            icon={<MapPin className="w-5 h-5" />}
          />
          <StatCard
            value={p.location.dealership_category || "Member"}
            label="Category"
            icon={<Briefcase className="w-5 h-5" />}
          />
        </div>

        {/* ── Locked — Personal Info ───────────────────────── */}
        <SectionCard
          title="Personal Information"
          icon={<User className="w-4 h-4" />}
          action={
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg cursor-help">
                  <Lock className="w-3 h-3" /> Locked
                </div>
              </TooltipTrigger>
              <TooltipContent>Contact admin to update these fields</TooltipContent>
            </Tooltip>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <InfoRow label="First Name" value={p.bio.first_name} locked />
            <InfoRow label="Last Name" value={p.bio.last_name} locked />
            <InfoRow label="Date of Birth" value={p.bio.date_of_birth} locked />
            <InfoRow label="Gender" value={p.bio.gender} locked />
            <InfoRow label="Nationality" value={p.bio.nationality} locked />
            <InfoRow label="Occupation" value={p.bio.occupation} locked />
          </div>
        </SectionCard>

        {/* ── Locked — State & LGA ─────────────────────────── */}
        <SectionCard
          title="State & LGA"
          icon={<MapPin className="w-4 h-4" />}
          action={
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg cursor-help">
                  <Lock className="w-3 h-3" /> Locked
                </div>
              </TooltipTrigger>
              <TooltipContent>Contact admin to update state or LGA</TooltipContent>
            </Tooltip>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <InfoRow label="State" value={p.location.state} locked />
            <InfoRow label="LGA" value={p.location.lga} locked />
          </div>
        </SectionCard>

        {/* ── Editable — Address & Business ────────────────── */}
        <SectionCard
          title="Address & Business"
          icon={<Building2 className="w-4 h-4" />}
          action={
            editSection !== "address" ? (
              <Button
                variant="ghost" size="sm" className="h-7 text-xs"
                onClick={() => setEditSection("address")}
              >
                <Edit3 className="w-3 h-3 mr-1" /> Edit
              </Button>
            ) : (
              <div className="flex gap-1.5">
                <Button
                  variant="ghost" size="sm" className="h-7 text-xs"
                  onClick={() => setEditSection(null)} disabled={isSaving}
                >
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm" className="h-7 text-xs"
                  onClick={handleSaveAddress} disabled={isSaving}
                >
                  {isSaving
                    ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    : <Save className="w-3 h-3 mr-1" />}
                  Save
                </Button>
              </div>
            )
          }
        >
          {editSection === "address" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Address</Label>
                <Textarea
                  rows={3}
                  value={editAddress.fullAddress}
                  onChange={(e) => setEditAddress({ ...editAddress, fullAddress: e.target.value })}
                  className="resize-none"
                />
              </div>
              {(p.location.dealership_name || p.location.business_description) && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Business Description</Label>
                  <Textarea
                    rows={2}
                    value={editAddress.businessDescription}
                    onChange={(e) =>
                      setEditAddress({ ...editAddress, businessDescription: e.target.value })
                    }
                    className="resize-none"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <InfoRow label="Full Address" value={p.location.full_address} />
              {p.location.dealership_name && (
                <InfoRow label="Dealership Name" value={p.location.dealership_name} />
              )}
              {p.location.dealership_category && (
                <InfoRow label="Category" value={p.location.dealership_category} />
              )}
              {p.location.years_in_operation != null && (
                <InfoRow
                  label="Years in Operation"
                  value={`${p.location.years_in_operation} years`}
                />
              )}
              {p.location.business_description && (
                <InfoRow
                  label="Business Description"
                  value={p.location.business_description}
                />
              )}
            </div>
          )}
        </SectionCard>

        {/* ── Editable — Contact Info ───────────────────────── */}
        <SectionCard
          title="Contact Information"
          icon={<Phone className="w-4 h-4" />}
          action={
            editSection !== "contact" ? (
              <Button
                variant="ghost" size="sm" className="h-7 text-xs"
                onClick={() => setEditSection("contact")}
              >
                <Edit3 className="w-3 h-3 mr-1" /> Edit
              </Button>
            ) : (
              <div className="flex gap-1.5">
                <Button
                  variant="ghost" size="sm" className="h-7 text-xs"
                  onClick={() => setEditSection(null)} disabled={isSaving}
                >
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm" className="h-7 text-xs"
                  onClick={handleSaveContact} disabled={isSaving}
                >
                  {isSaving
                    ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    : <Save className="w-3 h-3 mr-1" />}
                  Save
                </Button>
              </div>
            )
          }
        >
          {editSection === "contact" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  { label: "Primary Phone", key: "phonePrimary" },
                  { label: "Secondary / WhatsApp", key: "phoneSecondary" },
                  { label: "Email Address", key: "email" },
                  { label: "Next of Kin Name", key: "nokName" },
                  { label: "Next of Kin Phone", key: "nokPhone" },
                ] as { label: string; key: keyof typeof editContact }[]
              ).map(({ label, key }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={editContact[key]}
                    onChange={(e) =>
                      setEditContact({ ...editContact, [key]: e.target.value })
                    }
                    className="h-9"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <InfoRow label="Primary Phone" value={p.contact.phone_primary} />
              <InfoRow label="Secondary Phone" value={p.contact.phone_secondary} />
              <InfoRow label="Email" value={p.contact.email} />
              <InfoRow label="Next of Kin" value={p.contact.nok_name} />
              <InfoRow label="NOK Phone" value={p.contact.nok_phone} />
            </div>
          )}
        </SectionCard>

        {/* ── Emergency Contact ────────────────────────────── */}
        <SectionCard
          title="Emergency Contact"
          icon={<Users className="w-4 h-4" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <InfoRow label="Name" value={p.contact.nok_name} />
            <InfoRow label="Phone" value={p.contact.nok_phone} />
          </div>
        </SectionCard>

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="text-center py-4 space-y-1">
          <p className="text-xs text-muted-foreground">
            To update locked fields, contact your AMDON administrator.
          </p>
          <button
            onClick={handleLogout}
            className="text-xs text-destructive hover:underline"
          >
            Sign out of this account
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;