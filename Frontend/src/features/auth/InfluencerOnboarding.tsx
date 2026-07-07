import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Instagram, Loader2 } from "lucide-react";
import { instagramService } from "@/services/instagram";
import { Label } from "@/components/common/label";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { NICHES } from "@/constants";
import { onboardingService } from "@/services/onboarding";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import { Textarea } from "@/components/common/textarea";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function InfluencerOnboarding() {
  const [name, setName] = useState("");
  const [niche, setNiche] = useState<string>("Fashion");
  const [bio, setBio] = useState("");
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState<number | "">("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { patchUser } = useAuthStore();

  const save = useMutation({
    mutationFn: () => onboardingService.influencer({
      name, niche, bio,
      followerCount: Number(followers || 0),
      instagramHandle: handle || undefined,
      profileImageUrl: profileImageUrl || undefined,
    }),
    onSuccess: () => {
      patchUser({ isOnboarded: true, name });
      toast({ title: "You're in!", description: "Welcome to YouCollab." });
      navigate("/dashboard/influencer");
    },
    onError: (err: any) => {
      toast({ 
        variant: "destructive", 
        title: "Couldn't save", 
        description: err?.response?.data?.error?.message ?? err?.response?.data?.message ?? "Try again." 
      });
    },
  });

  const connectIG = useMutation({
    mutationFn: instagramService.connect,
    onSuccess: (d) => { if (d?.url) window.location.href = d.url; },
    onError: () => toast({ variant: "destructive", title: "Instagram connect failed" }),
  });

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const valid = name && countWords(bio) >= 3 && niche;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 neon-grid pointer-events-none" />
      <Navbar />
      <main className="relative mx-auto max-w-2xl px-4 pt-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="chip mb-3">Step 1 of 1</div>
          <h1 className="text-3xl font-semibold">Set up your creator profile</h1>
          <p className="text-sm text-muted-foreground mt-1">A few details so Pune brands can find you.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-strong rounded-3xl p-6 space-y-5">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" className="glass" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Niche</Label>
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                <SelectContent>{NICHES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Instagram handle (optional)</Label>
              <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourhandle" className="glass" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Bio <span className="text-muted-foreground">(min 3 words)</span></Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What makes your content unforgettable?" className="glass min-h-[110px]" />
            <p className="text-xs text-muted-foreground">{countWords(bio)}/3 words</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Follower count (fallback)</Label>
              <Input type="number" min={0} value={followers} onChange={(e) => setFollowers(e.target.value === "" ? "" : Number(e.target.value))} placeholder="12500" className="glass" />
            </div>
            <div className="space-y-1.5">
              <Label>Profile image URL (optional)</Label>
              <Input value={profileImageUrl} onChange={(e) => setProfileImageUrl(e.target.value)} placeholder="https://..." className="glass" />
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.01 }} className="rounded-2xl p-5 bg-gradient-neon text-primary-foreground relative overflow-hidden">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Instagram className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Connect Instagram via Meta</h3>
                <p className="text-sm opacity-90 mt-0.5">Verified followers, engagement & average likes — instantly. Pune brands trust verified creators 3× more.</p>
                <Button
                  onClick={() => connectIG.mutate()}
                  disabled={connectIG.isPending}
                  className="mt-3 bg-gradient-brand text-primary-foreground hover:opacity-95 border-0"
                >
                  {connectIG.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect Instagram"}
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="flex justify-end pt-2">
            <Button disabled={!valid || save.isPending} onClick={() => save.mutate()} className="bg-gradient-brand text-primary-foreground border-0">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish setup"}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
