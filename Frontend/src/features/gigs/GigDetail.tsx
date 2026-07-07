import { applicationsService } from "@/services/applications";
import { 
  ArrowLeft, Calendar, IndianRupee, MapPin, Sparkles, Loader2, 
  Send, ExternalLink, Globe, CheckCircle2, XCircle, AlertCircle, Edit3
} from "lucide-react";
import { Button } from "@/components/common/button";
import { gigsService } from "@/services/gigs";
import { motion } from "framer-motion";
import { Textarea } from "@/components/common/textarea";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function GigDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [coverNote, setCoverNote] = useState("");

  const { data: gig, isLoading, error } = useQuery({
    queryKey: ["gig", id],
    queryFn: () => gigsService.get(id),
    enabled: !!id,
  });

  const apply = useMutation({
    mutationFn: () => applicationsService.apply(id, coverNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gig", id] });
      qc.invalidateQueries({ queryKey: ["myApplications"] });
      toast({ title: "Pitch sent successfully! 🚀", description: "The brand will review your profile shortly." });
      setCoverNote("");
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast({ variant: "destructive", title: "Apply failed", description: err?.response?.data?.message ?? "Try again." }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-xl px-4 py-20 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-semibold">Gig not found</h1>
          <p className="text-sm text-muted-foreground">The brief you are looking for does not exist or was deleted.</p>
          <Button asChild variant="outline" className="h-9 text-[13px] rounded-sm">
            <Link to="/marketplace">Go to Marketplace</Link>
          </Button>
        </main>
      </div>
    );
  }

  const isOwner = user?.role === "BRAND" && (gig as any).brandId === user?.profile?.id;
  const hasApplied = (gig as any).hasApplied;
  const application = (gig as any).application;

  return (
    <div className="relative min-h-screen overflow-hidden text-foreground">
      <div className="absolute inset-0 neon-grid pointer-events-none" />
      <main className="relative mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="mb-2">
          <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {/* Main Content Layout */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Gig Details column (Left 2 cols) */}
          <div className="md:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="chip text-foreground font-semibold">{gig.category}</span>
                {gig.platform && <span className="chip text-foreground font-semibold bg-primary/10 border-primary/20">{gig.platform}</span>}
                {gig.campaignType && <span className="chip text-foreground font-semibold bg-secondary/10 border-secondary/20">{gig.campaignType}</span>}
                <span className="chip text-muted-foreground"><MapPin className="h-3.5 w-3.5 mr-1" />{gig.city}</span>
                <span className="chip text-muted-foreground">
                  Status: <span className={`font-bold ml-1 ${gig.status === "OPEN" ? "text-emerald-400" : "text-zinc-400"}`}>{gig.status}</span>
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{gig.title}</h1>

              <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-border/30">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 border border-border rounded-sm flex items-center justify-center bg-background">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none font-semibold">Budget range</p>
                    <p className="text-sm font-semibold mt-1">₹{gig.budgetMin?.toLocaleString()} - {gig.budgetMax ? `₹${gig.budgetMax.toLocaleString()}` : "No limit"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 border border-border rounded-sm flex items-center justify-center bg-background">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none font-semibold">Deadline</p>
                    <p className="text-sm font-semibold mt-1">{new Date(gig.deadline).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Campaign Brief */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Campaign Description</h3>
                <p className="text-[14px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{gig.description}</p>
              </div>

              <div className="pt-4 border-t border-border/30">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Deliverables Expected</h3>
                <p className="text-[14px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{gig.deliverables}</p>
              </div>

              <div className="pt-4 border-t border-border/30">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Creator Requirements</h3>
                <p className="text-[14px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{gig.creatorRequirements || "No specific requirements outlined."}</p>
              </div>
            </motion.div>

            {/* Application Section */}
            {user?.role === "INFLUENCER" && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-strong rounded-2xl p-6 space-y-4 border-primary/20">
                <h3 className="text-md font-semibold tracking-tight">Your Pitch</h3>
                
                {hasApplied ? (
                  <div className="space-y-4">
                    <div className={`p-4 border rounded-xl flex items-start gap-3 ${
                      application?.status === "ACCEPTED" 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                        : application?.status === "REJECTED" 
                        ? "bg-red-500/10 border-red-500/20 text-red-400" 
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    }`}>
                      {application?.status === "ACCEPTED" && <CheckCircle2 className="h-5 w-5 shrink-0" />}
                      {application?.status === "REJECTED" && <XCircle className="h-5 w-5 shrink-0" />}
                      {application?.status === "PENDING" && <Loader2 className="h-5 w-5 shrink-0 animate-spin" />}
                      
                      <div>
                        <h4 className="font-semibold text-sm">Pitch Status: {application?.status}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {application?.status === "ACCEPTED" && "Congratulations! The brand has accepted your pitch. Check your messages/inbox."}
                          {application?.status === "REJECTED" && "The brand has reviewed your pitch and decided to pass on this collab brief. Keep applying!"}
                          {application?.status === "PENDING" && "Pitch submitted. The brand is currently reviewing your profile & engagement metrics."}
                        </p>
                      </div>
                    </div>

                    <div className="glass rounded-xl p-4 bg-background/50">
                      <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Your Cover Message</p>
                      <p className="text-sm italic text-muted-foreground whitespace-pre-wrap">"{application?.coverNote}"</p>
                    </div>
                  </div>
                ) : gig.status !== "OPEN" ? (
                  <p className="text-sm text-muted-foreground">Applications are now closed for this collab campaign.</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[12px] text-muted-foreground">Introduce yourself and outline why you are the ideal fit for this collab campaign brief.</p>
                    <Textarea 
                      value={coverNote} 
                      onChange={(e) => setCoverNote(e.target.value)} 
                      rows={5} 
                      placeholder="Hi brand! I have a strong following in Koregaon Park and specialize in culinary reviews..." 
                      className="glass rounded-sm text-[13px] border-border/40" 
                    />
                    <Button 
                      onClick={() => apply.mutate()} 
                      disabled={!coverNote.trim() || apply.isPending}
                      className="w-full h-9 rounded-sm bg-gradient-brand text-primary-foreground border-0 text-[13px]"
                    >
                      {apply.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1" /> Send Pitch brief</>}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {isOwner && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6 flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div>
                  <h4 className="font-semibold text-sm">You own this Brief</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage details or view current submissions.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                  <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial h-9 rounded-sm text-[13px]">
                    <Link to={`/gigs/${gig.id}/edit`}><Edit3 className="h-3.5 w-3.5 mr-1" /> Edit brief</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1 sm:flex-initial h-9 rounded-sm text-[13px] bg-gradient-brand text-primary-foreground border-0">
                    <Link to={`/gigs/${gig.id}/applicants`}>View pitches</Link>
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Brand Info Side Column (Right 1 col) */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="glass-strong rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About the Brand</h3>
              
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-brand shrink-0 flex items-center justify-center text-primary-foreground font-bold text-lg overflow-hidden border border-border">
                  {(gig as any).brand?.logoUrl ? (
                    <img src={(gig as any).brand.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    ((gig as any).brand?.businessName || "B")[0]
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-[14px] truncate">{(gig as any).brand?.businessName || "Anonymous Brand"}</h4>
                  <p className="text-xs text-muted-foreground truncate">{(gig as any).brand?.category || "Category"}</p>
                </div>
              </div>

              {(gig as any).brand?.bio && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {(gig as any).brand.bio}
                </p>
              )}

              <div className="pt-3 border-t border-border/30 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{(gig as any).brand?.location || "Pune"}</span>
                </div>
                
                {(gig as any).brand?.website && (
                  <a 
                    href={(gig as any).brand.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-[#5B8CFF] hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Visit Website</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
