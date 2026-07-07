import { apiClient } from "@/lib/api";
import { Button } from "@/components/common/button";
import { CATEGORIES } from "@/constants";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Loader2, ArrowLeft, Pencil } from "lucide-react";
import { profileService } from "@/services/profile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import { Textarea } from "@/components/common/textarea";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function BrandProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { patchUser } = useAuthStore();

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Cafe");
  const [location, setLocation] = useState("Pune");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: profileService.getProfile,
  });

  useEffect(() => {
    if (profile && profile.brand) {
      setBusinessName(profile.brand.businessName || "");
      setCategory(profile.brand.category || "Cafe");
      setLocation(profile.brand.location || "Pune");
      setBio(profile.brand.bio || "");
      setWebsite(profile.brand.website || "");
      setLogoUrl(profile.brand.logoUrl || "");
    }
  }, [profile]);

  const update = useMutation({
    mutationFn: () => profileService.updateProfile({
      businessName, category, location, bio,
      website: website || undefined,
      logoUrl: logoUrl || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      patchUser({ name: businessName, avatarUrl: logoUrl || null });
      toast({ title: "Profile updated successfully! ✨" });
    },
    onError: (e: any) =>
      toast({ 
        variant: "destructive", 
        title: "Update failed", 
        description: e?.response?.data?.error?.message ?? e?.response?.data?.message ?? "Try again." 
      }),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = data.data?.url || data.url;
      if (url) {
        setLogoUrl(url);
        toast({ title: "Logo updated successfully! 📸" });
      }
    } catch {
      toast({ variant: "destructive", title: "Upload failed", description: "Could not upload image." });
    } finally {
      setUploading(false);
    }
  };

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const valid = businessName && category && location && countWords(bio) >= 3;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
        
        {/* Back Link */}
        <div>
          <Button onClick={() => navigate("/dashboard/brand")} variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground h-8 text-[12px] rounded-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
        </div>

        {/* Header Section matching Dashboard layout */}
        <div>
          <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm mb-3">Profile settings</span>
          <h1 className="text-3xl font-semibold tracking-tight">Brand profile</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Manage details about your business shown to creators.</p>
        </div>

        {/* Content Panel Box matching Dashboard card style */}
        <div className="border border-border rounded-sm p-6 bg-background space-y-5">
          <div className="flex items-center gap-4">
            {/* Logo Container with Pen Upload Overlay */}
            <div className="relative group h-16 w-16 rounded-sm bg-gradient-brand shrink-0 flex items-center justify-center text-primary-foreground font-bold text-xl overflow-hidden border border-border">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                businessName?.[0] || "B"
              )}

              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity duration-200">
                <Pencil className="h-4 w-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{businessName || "Your business"}</h3>
              <p className="text-xs text-muted-foreground">Category: {category} · Location: {location}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Business name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Koregaon Coffee Co." className="h-9 text-[13px] rounded-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Registered Email <span className="text-muted-foreground">(read-only)</span></Label>
            <Input value={profile?.email || ""} disabled className="h-9 text-[13px] rounded-sm opacity-60 cursor-not-allowed bg-muted/40" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-[13px] rounded-sm bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-9 text-[13px] rounded-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Bio <span className="text-muted-foreground">(min 3 words)</span></Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What does your brand stand for?" className="text-[13px] rounded-sm min-h-[110px]" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{countWords(bio)}/3 words</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Website (optional)</Label>
            <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="h-9 text-[13px] rounded-sm" />
          </div>

          <div className="flex justify-end pt-2">
            <Button disabled={!valid || update.isPending || uploading} onClick={() => update.mutate()} className="h-9 text-[13px] rounded-sm bg-gradient-brand text-primary-foreground border-0 shadow-md hover:opacity-95">
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </div>

      </main>
    </div>
  );
}
