import { Button } from "@/components/common/button";
import { CATEGORIES } from "@/constants";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { onboardingService } from "@/services/onboarding";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import { Textarea } from "@/components/common/textarea";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function BrandOnboarding() {
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState<string>("Cafe");
  const [location, setLocation] = useState("Pune");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { patchUser } = useAuthStore();

  const save = useMutation({
    mutationFn: () => onboardingService.brand({
      businessName, category, location, bio,
      website: website || undefined,
      logoUrl: logoUrl || undefined,
    }),
    onSuccess: () => {
      patchUser({ isOnboarded: true, name: businessName });
      toast({ title: "Welcome to YouCollab!" });
      navigate("/dashboard/brand");
    },
    onError: (err: any) =>
      toast({ 
        variant: "destructive", 
        title: "Save failed", 
        description: err?.response?.data?.error?.message ?? err?.response?.data?.message ?? "Try again." 
      }),
  });

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const valid = businessName && category && location && countWords(bio) >= 3;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 neon-grid pointer-events-none" />
      <Navbar />
      <main className="relative mx-auto max-w-2xl px-4 pt-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="chip mb-3">Brand setup</div>
          <h1 className="text-3xl font-semibold">Tell us about your brand</h1>
          <p className="text-sm text-muted-foreground mt-1">Creators will see this on every gig you post.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-strong rounded-3xl p-6 space-y-5">
          <div className="space-y-1.5">
            <Label>Business name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Koregaon Coffee Co." className="glass" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="glass" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Bio <span className="text-muted-foreground">(min 3 words)</span></Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What does your brand stand for?" className="glass min-h-[110px]" />
            <p className="text-xs text-muted-foreground">{countWords(bio)}/3 words</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Website (optional)</Label>
              <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="glass" />
            </div>
            <div className="space-y-1.5">
              <Label>Logo URL (optional)</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="glass" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button disabled={!valid || save.isPending} onClick={() => save.mutate()} className="bg-gradient-brand text-primary-foreground border-0">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Launch brand"}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
