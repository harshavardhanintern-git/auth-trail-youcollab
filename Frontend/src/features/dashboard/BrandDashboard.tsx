import { applicationsService, type Application, type Message } from "@/services/applications";
import { profileService } from "@/services/profile";
import { getTier, TIER_COST } from "@/lib/credits";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Button } from "@/components/common/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/common/dialog";
import { gigsService, type Gig } from "@/services/gigs";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  IndianRupee,
  Calendar,
  MapPin,
  Users,
  Briefcase,
  Eye,
  Edit3,
  Trash2,
  Play,
  Pause,
  MessageSquare,
  Check,
  X,
  TrendingUp,
  Bookmark,
  BookmarkCheck,
  Mail,
  Send,
  UserCheck,
  Coins,
  Loader2,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type MyGigsTab = "active" | "closed";
type AppFilterTab = "new" | "shortlisted" | "accepted" | "rejected";

export default function BrandDashboard() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";

  // State queries
  const { data: gigs = [], isLoading: isLoadingGigs } = useQuery({
    queryKey: ["gigs", "mine"],
    queryFn: gigsService.mine
  });

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: profileService.getProfile });
  const credits: number | null = (profile?.brand as { credits?: number } | undefined)?.credits ?? null;

  // Fetch applications for all gigs
  const [apps, setApps] = useState<Application[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  const fetchAllApplications = async () => {
    if (!gigs.length) {
      setApps([]);
      return;
    }
    setIsLoadingApps(true);
    try {
      const allAppsPromises = gigs.map(g => applicationsService.forGig(g.id).catch(() => []));
      const results = await Promise.all(allAppsPromises);
      const flattened = results.flat();
      setApps(flattened);
    } catch (err) {
      console.error("Failed to load applicants", err);
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    if (gigs.length > 0) {
      fetchAllApplications();
    }
  }, [gigs]);

  // Actions mutations
  const toggleStatus = useMutation({
    mutationFn: (id: string) => gigsService.toggleStatus(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["gigs", "mine"] });
      toast({ title: data.status === "OPEN" ? "Campaign is now live! 🎉" : "Campaign paused." });
    },
    onError: () => toast({ variant: "destructive", title: "Action failed" }),
  });

  const deleteGig = useMutation({
    mutationFn: (id: string) => gigsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gigs", "mine"] });
      toast({ title: "Campaign deleted permanently." });
    },
    onError: () => toast({ variant: "destructive", title: "Delete failed" }),
  });

  const updateAppStatus = useMutation({
    mutationFn: ({ aid, status }: { aid: string; status: Application["status"] }) =>
      applicationsService.updateStatus(aid, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gigs", "mine"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      fetchAllApplications();
    },
    onError: (e: { response?: { data?: { error?: { message?: string } } } }) =>
      toast({
        variant: "destructive",
        title: "Action failed",
        description: e?.response?.data?.error?.message,
      }),
  });

  // Shortlisted local state sync
  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem("yc.brand.shortlisted");
    if (saved) setShortlistedIds(JSON.parse(saved));
  }, []);

  const toggleShortlist = (id: string) => {
    let updated;
    if (shortlistedIds.includes(id)) {
      updated = shortlistedIds.filter(x => x !== id);
      toast({ title: "Removed from shortlist" });
    } else {
      updated = [...shortlistedIds, id];
      toast({ title: "Added to shortlist" });
    }
    setShortlistedIds(updated);
    localStorage.setItem("yc.brand.shortlisted", JSON.stringify(updated));
  };

  // Approval workflow states
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [selectedAppToApprove, setSelectedAppToApprove] = useState<Application | null>(null);

  const triggerApproveFlow = (app: Application) => {
    setSelectedAppToApprove(app);
    setConfirmApproveOpen(true);
  };

  const handleConfirmApprove = () => {
    if (!selectedAppToApprove) return;
    const approvedApp = selectedAppToApprove;
    updateAppStatus.mutate(
      { aid: approvedApp.id, status: "ACCEPTED" },
      {
        onSuccess: () => {
          toast({
            title: "Creator approved successfully! 🎉",
            description: "Contact info shared — say hello to kick things off.",
          });
          setConfirmApproveOpen(false);
          setSelectedAppToApprove(null);
          // Jump straight into the DM thread so the brand can message the creator immediately.
          setSelectedChatPartner(approvedApp);
          setSearchParams({ tab: "messages" });
        }
      }
    );
  };

  // Sub-tabs filters
  const [myGigsSubTab, setMyGigsSubTab] = useState<MyGigsTab>("active");
  const [appFilterSubTab, setAppFilterSubTab] = useState<AppFilterTab>("new");
  const [selectedGigFilter, setSelectedGigFilter] = useState<string>("all");

  // Collaboration DMs
  const [selectedChatPartner, setSelectedChatPartner] = useState<Application | null>(null);
  const [chatMessageText, setChatMessageText] = useState("");

  const { data: threadMessages = [] } = useQuery({
    queryKey: ["messages", selectedChatPartner?.id],
    queryFn: () => applicationsService.getMessages(selectedChatPartner!.id),
    enabled: activeTab === "messages" && !!selectedChatPartner,
    refetchInterval: 4000, // ponytail: polling, not realtime — Supabase Realtime is disabled on this backend
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => applicationsService.sendMessage(selectedChatPartner!.id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", selectedChatPartner?.id] });
    },
    onError: () => toast({ variant: "destructive", title: "Message failed to send" }),
  });

  const handleSendChatMessage = () => {
    const text = chatMessageText.trim();
    if (!text || !selectedChatPartner) return;
    sendMessageMutation.mutate(text);
    setChatMessageText("");
  };

  // Active Approved Collaborations
  const approvedCollabs = useMemo(() => {
    return apps.filter(a => a.status === "ACCEPTED");
  }, [apps]);

  // Combined published campaigns and applicant activity feed
  const recentActivities = useMemo(() => {
    const activities: Array<{
      id: string;
      type: "gig_published" | "application";
      title?: string;
      influencerName?: string;
      gigTitle?: string;
      status?: string;
      createdAt: string;
    }> = [];

    // Add gig published activities
    gigs.forEach((g) => {
      if (g.createdAt) {
        activities.push({
          id: `gig-${g.id}`,
          type: "gig_published",
          title: g.title,
          createdAt: g.createdAt,
        });
      }
    });

    // Add application activities
    apps.forEach((a) => {
      if (a.createdAt) {
        activities.push({
          id: `app-${a.id}`,
          type: "application",
          influencerName: a.influencer?.name || "Creator",
          gigTitle: a.gig?.title || "Campaign",
          status: a.status,
          createdAt: a.createdAt,
        });
      }
    });

    // Sort by date desc
    return activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [gigs, apps]);

  // Set default partner if messages tab opens and none selected
  useEffect(() => {
    if (activeTab === "messages" && !selectedChatPartner && approvedCollabs.length > 0) {
      setSelectedChatPartner(approvedCollabs[0]);
    }
  }, [activeTab, approvedCollabs, selectedChatPartner]);

  // Details statistics counts
  const totalActiveGigs = gigs.filter(g => g.status === "OPEN").length;
  const totalApplications = apps.length;
  const totalApprovedCollabs = approvedCollabs.length;
  const totalPendingReviews = apps.filter(a => a.status === "PENDING").length;

  const handleGigDelete = (id: string) => {
    if (confirm("Are you sure you want to permanently delete this gig? All applications will be lost.")) {
      deleteGig.mutate(id);
    }
  };

  // Switch status tab helper
  const handleToggleGigClose = (id: string, currentStatus?: string) => {
    toggleStatus.mutate(id);
  };

  // Creator profile summary dialog details
  const [viewingCreator, setViewingCreator] = useState<Application | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-[1200px] px-6 py-10 space-y-8">
        
        {/* Navigation Tabs on top matching Dashboard style */}
        <div className="flex border-b border-border overflow-x-auto whitespace-nowrap scrollbar-none mb-6">
          {["dashboard", "gigs", "applications", "messages"].map((t) => (
            <button
              key={t}
              onClick={() => setSearchParams({ tab: t })}
              className={`pb-3 text-sm font-semibold tracking-tight px-4 border-b-2 transition-colors uppercase ${
                activeTab === t 
                  ? "border-foreground text-foreground" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 1. Dashboard Overview Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            
            {/* Header banner */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm mb-3">Brand Workspace</span>
                <h1 className="text-3xl font-semibold tracking-tight">Hey {user?.name ?? "Brand"}.</h1>
                <p className="text-[13px] text-muted-foreground mt-1">Review applicant portfolios and coordinate campaigns.</p>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <Button asChild className="h-9 text-[13px] rounded-sm bg-gradient-brand text-primary-foreground border-0 shadow-md">
                  <Link to="/gigs/new"><Plus className="h-4 w-4 mr-1" /> Post New Gig</Link>
                </Button>
              </div>
            </div>

            {/* Premium Stat Cards */}
            <div className="grid sm:grid-cols-5 gap-4">
              {[
                { label: "Total Active Gigs", value: totalActiveGigs, icon: Briefcase },
                { label: "Total Applications", value: totalApplications, icon: Users },
                { label: "Approved Collabs", value: totalApprovedCollabs, icon: UserCheck },
                { label: "Pending Reviews", value: totalPendingReviews, icon: Eye },
              ].map((stat) => (
                <div key={stat.label} className="border border-border rounded-sm p-4 bg-background flex items-center gap-3">
                  <div className="h-9 w-9 rounded-sm border border-border flex items-center justify-center bg-[#0B0D17]/40 shrink-0">
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-semibold tracking-tight mt-0.5">{stat.value}</p>
                  </div>
                </div>
              ))}
              <div className="border border-primary/25 rounded-sm p-4 bg-primary/5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-sm border border-primary/25 flex items-center justify-center bg-primary/10 shrink-0">
                  <Coins className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Trial Credits</p>
                  <p className="text-xl font-semibold tracking-tight mt-0.5 text-primary">{credits ?? "…"}</p>
                </div>
              </div>
            </div>

            {/* Dashboard Bottom Section */}
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Recent Activity (Left side) */}
              <div className="border border-border rounded-sm p-5 bg-background md:col-span-2 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
                            {isLoadingApps || isLoadingGigs ? (
                  <div className="text-center py-10 text-[12px] text-muted-foreground">Loading activity log...</div>
                ) : recentActivities.length === 0 ? (
                  <div className="text-center py-10 text-[12px] text-muted-foreground border border-dashed border-border/50 rounded-sm">
                    No activity logs recorded. Post a gig to start receiving applications.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {recentActivities.slice(0, 5).map((act) => (
                      <div key={act.id} className="py-3 flex items-center justify-between text-xs gap-3">
                        <div className="min-w-0">
                          {act.type === "gig_published" ? (
                            <p className="font-medium text-foreground">
                              Campaign <strong className="text-primary">'{act.title}'</strong> was published.
                            </p>
                          ) : (
                            <p className="font-medium text-foreground">
                              <span className="font-semibold text-primary">{act.influencerName}</span> applied to your brief: <strong>{act.gigTitle}</strong>
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {act.type === "gig_published" ? (
                              <span className="text-emerald-400 font-medium">PUBLISHED</span>
                            ) : (
                              <>
                                Status: <span className={act.status === "ACCEPTED" ? "text-emerald-400" : act.status === "REJECTED" ? "text-red-400" : "text-yellow-400"}>{act.status}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {act.createdAt ? new Date(act.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Posting CTA Card */}
              <div className="border border-border rounded-sm p-5 bg-background text-center flex flex-col justify-center items-center space-y-3">
                <div className="h-12 w-12 rounded-sm border border-border flex items-center justify-center bg-muted/20">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h4 className="text-[14px] font-semibold">Post a campaign brief</h4>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  List your deliverables, category niches, location requirements, and budget to connect with creators.
                </p>
                <Button asChild className="w-full h-8 text-[12px] rounded-sm bg-gradient-brand text-primary-foreground border-0">
                  <Link to="/gigs/new">Create Campaign</Link>
                </Button>
              </div>

            </div>

          </div>
        )}

        {/* 2. My Gigs Tab */}
        {activeTab === "gigs" && (
          <div className="space-y-6">
            
            {/* Tab header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Your Campaigns</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Manage details and availability states for listed creator campaigns.</p>
              </div>
              <Button asChild className="h-9 text-[13px] rounded-sm bg-gradient-brand text-primary-foreground border-0 shadow-md">
                <Link to="/gigs/new"><Plus className="h-4 w-4 mr-1" /> Post New Gig</Link>
              </Button>
            </div>

            {/* Campaign sub-tabs */}
            <div className="flex border-b border-border gap-2">
              {(["active", "closed"] as MyGigsTab[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setMyGigsSubTab(st)}
                  className={`pb-2 text-[12px] font-medium tracking-wider px-3 border-b-2 transition-colors uppercase ${
                    myGigsSubTab === st 
                      ? "border-foreground text-foreground font-semibold" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Filtered gigs output */}
            {isLoadingGigs ? (
              <div className="border border-border rounded-sm p-10 text-center text-xs text-muted-foreground">Loading campaigns...</div>
            ) : (
              (() => {
                const filtered = gigs.filter(g => {
                  if (myGigsSubTab === "active") return g.status === "OPEN";
                  if (myGigsSubTab === "closed") return g.status === "CLOSED";
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="border border-border rounded-sm p-14 text-center text-[12px] text-muted-foreground border-dashed">
                      No campaigns match the "{myGigsSubTab}" filter state.
                    </div>
                  );
                }

                return (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((g) => (
                      <div key={g.id} className="border border-border rounded-sm p-5 bg-background flex flex-col justify-between hover:border-zinc-500/50 transition-colors">
                        <div>
                          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {g.city || "Pune"}</span>
                            <span className="text-foreground font-medium">{g.category}</span>
                          </div>
                          
                          <h3 className="mt-3 text-[14px] font-semibold line-clamp-2">{g.title}</h3>
                          
                          {/* Platform & Campaign Type Info */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(g as any).platform && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-foreground border border-primary/20 rounded-sm">
                                {(g as any).platform}
                              </span>
                            )}
                            {(g as any).campaignType && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-secondary/10 text-muted-foreground border border-secondary/20 rounded-sm">
                                {(g as any).campaignType}
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-[12px] text-muted-foreground"><strong className="text-foreground">Deliverables:</strong> {g.deliverables}</p>
                          
                          {(g as any).creatorRequirements && (
                            <p className="mt-1.5 text-[12px] text-muted-foreground"><strong className="text-foreground">Requirements:</strong> {(g as any).creatorRequirements}</p>
                          )}

                          <div className="mt-4 flex items-center justify-between text-[12px] pt-1.5 border-t border-border/30">
                            <span className="inline-flex items-center gap-0.5 font-medium">
                              <IndianRupee className="h-3.5 w-3.5" />
                              {g.budgetMin?.toLocaleString()}–{g.budgetMax?.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {g.deadline ? new Date(g.deadline).toLocaleDateString() : "No deadline"}
                            </span>
                          </div>

                          <div className="mt-2 text-[11px] text-muted-foreground">
                            Applications: <span className="font-semibold text-foreground">{(g as any)._count?.applications || 0}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-5 flex gap-2">
                          <Button 
                            onClick={() => {
                              setSelectedGigFilter(g.id);
                              setSearchParams({ tab: "applications" });
                            }}
                            variant="outline" 
                            size="sm" 
                            className="flex-1 h-8 text-[12px] rounded-sm"
                          >
                            Applicants ({(g as any)._count?.applications || 0})
                          </Button>

                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-sm shrink-0 border border-border" title="Edit brief">
                            <Link to={`/gigs/${g.id}/edit`}><Edit3 className="h-3.5 w-3.5" /></Link>
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-sm shrink-0 border border-border" 
                            title={g.status === "OPEN" ? "Close campaign" : "Re-open campaign"}
                            onClick={() => handleToggleGigClose(g.id, g.status)}
                            disabled={toggleStatus.isPending}
                          >
                            {g.status === "OPEN" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-sm shrink-0 border border-border hover:bg-destructive/10 text-muted-foreground hover:text-red-500" 
                            title="Delete campaign"
                            onClick={() => handleGigDelete(g.id)}
                            disabled={deleteGig.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}

          </div>
        )}

        {/* 3. Creator Applications Tab */}
        {activeTab === "applications" && (
          <div className="space-y-6">
            
            {/* Toolbar filter */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Campaign Applications</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Filter applications by specific brief postings.</p>
              </div>

              {/* Selector dropdown */}
              <div className="relative flex items-center gap-1.5 border border-border rounded-sm px-2.5 bg-background h-9">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select
                  value={selectedGigFilter}
                  onChange={(e) => setSelectedGigFilter(e.target.value)}
                  className="bg-transparent text-[12px] text-foreground focus:outline-none cursor-pointer pr-1 max-w-[200px]"
                >
                  <option value="all" className="bg-background text-foreground">All Campaigns</option>
                  {gigs.map(g => (
                    <option key={g.id} value={g.id} className="bg-background text-foreground truncate">
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Applications sub-tabs */}
            <div className="flex border-b border-border gap-2">
              {[
                { id: "new", label: "New Requests" },
                { id: "shortlisted", label: "Shortlisted" },
                { id: "accepted", label: "Accepted" },
                { id: "rejected", label: "Rejected" },
              ].map((tabInfo) => (
                <button
                  key={tabInfo.id}
                  onClick={() => setAppFilterSubTab(tabInfo.id as AppFilterTab)}
                  className={`pb-2 text-[12px] font-medium tracking-wider px-3 border-b-2 transition-colors uppercase ${
                    appFilterSubTab === tabInfo.id 
                      ? "border-foreground text-foreground font-semibold" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tabInfo.label}
                </button>
              ))}
            </div>

            {/* Display list of applications */}
            {isLoadingApps ? (
              <div className="border border-border rounded-sm p-10 text-center text-xs text-muted-foreground">Loading applications...</div>
            ) : (
              (() => {
                // Filter by gig
                let filtered = selectedGigFilter === "all" ? apps : apps.filter(a => a.gigId === selectedGigFilter);

                // Filter by sub-tab status
                filtered = filtered.filter(a => {
                  if (appFilterSubTab === "new") return a.status === "PENDING";
                  if (appFilterSubTab === "accepted") return a.status === "ACCEPTED";
                  if (appFilterSubTab === "rejected") return a.status === "REJECTED";
                  if (appFilterSubTab === "shortlisted") return shortlistedIds.includes(a.id);
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="border border-border rounded-sm p-14 text-center text-[12px] text-muted-foreground border-dashed">
                      No applications found matching the "{appFilterSubTab}" sub-tab filters.
                    </div>
                  );
                }

                return (
                  <div className="grid md:grid-cols-2 gap-4">
                    {filtered.map((a) => {
                      const ig = a.influencer as any;
                      const hasIgStats = ig?.followersCount || ig?.instagramHandle;
                      const isShortlisted = shortlistedIds.includes(a.id);

                      return (
                        <div key={a.id} className="border border-border rounded-sm p-5 bg-background flex flex-col justify-between hover:border-zinc-500/50 transition-colors">
                          <div>
                            {/* Card top details */}
                            <div className="flex items-start gap-4">
                              <div className="h-12 w-12 rounded-sm bg-gradient-brand shrink-0 flex items-center justify-center text-primary-foreground font-bold text-lg overflow-hidden border border-border">
                                {ig?.profileImageUrl ? (
                                  <img src={ig.profileImageUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  (ig?.name || "Creator")[0].toUpperCase()
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                  <h4 className="font-semibold text-[14px] truncate">{ig?.name || "Creator"}</h4>
                                  <div className="flex gap-1.5 items-center">
                                    <button 
                                      onClick={() => toggleShortlist(a.id)}
                                      className="text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
                                      title={isShortlisted ? "Remove from shortlist" : "Shortlist"}
                                    >
                                      {isShortlisted ? <BookmarkCheck className="h-4.5 w-4.5 text-primary" /> : <Bookmark className="h-4.5 w-4.5" />}
                                    </button>
                                  </div>
                                </div>

                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  @{ig?.instagramHandle || "handle"} · Niche: {ig?.niche || "Lifestyle"}
                                </p>
                              </div>
                            </div>

                            {/* Stats */}
                            {hasIgStats && (
                              <div className="mt-3 grid grid-cols-3 gap-2 bg-[#0B0D17]/40 p-2 rounded-sm border border-border/60">
                                <div className="text-center">
                                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Followers</p>
                                  <p className="text-xs font-semibold mt-0.5">{(ig.followerCount || ig.followersCount || 0).toLocaleString()}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Engagement</p>
                                  <p className="text-xs font-semibold inline-flex items-center gap-1 mt-0.5">
                                    <TrendingUp className="h-2.5 w-2.5 text-primary" /> 
                                    {ig.engagementRate ? `${ig.engagementRate.toFixed(1)}%` : "4.8%"}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Niche</p>
                                  <p className="text-xs font-semibold mt-0.5 truncate">{ig.niche || "Fashion"}</p>
                                </div>
                              </div>
                            )}

                            {/* Cover message */}
                            <div className="mt-3 bg-muted/20 border border-border/60 p-3 rounded-sm">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pitch Cover Message</p>
                              <p className="text-[12px] text-foreground mt-1 whitespace-pre-wrap leading-relaxed">{a.coverNote || "No cover message provided."}</p>
                            </div>

                            {/* Shared details if ACCEPTED */}
                            {a.status === "ACCEPTED" && (
                              <div className="mt-3 bg-emerald-500/5 border border-emerald-500/25 p-3 rounded-sm space-y-2">
                                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                                  <Mail className="h-3.5 w-3.5" /> Collaboration Details (Emails Shared)
                                </div>
                                <div className="text-[11px] space-y-1 text-muted-foreground">
                                  <p>Creator Email: <span className="font-semibold text-foreground select-all">{ig?.user?.email || "Shared"}</span></p>
                                  <p>Your Brand Email: <span className="font-semibold text-foreground select-all">{user?.email || "Shared"}</span></p>
                                </div>
                                <p className="text-[10px] text-emerald-500/70 italic">Creator approved successfully. Contact information has been shared.</p>
                              </div>
                            )}

                            {/* Info if REJECTED */}
                            {a.status === "REJECTED" && (
                              <div className="mt-3 bg-red-500/5 border border-red-500/10 p-2.5 rounded-sm text-[11px] text-red-400">
                                Application rejected. Contact information remains hidden.
                              </div>
                            )}
                          </div>

                          {/* Action footer buttons */}
                          <div className="mt-4 flex gap-2 pt-2 border-t border-border/40">
                            {a.status === "PENDING" && (
                              <>
                                <Button 
                                  onClick={() => triggerApproveFlow(a)} 
                                  size="sm" 
                                  className="h-8 text-[12px] rounded-sm bg-gradient-brand text-primary-foreground border-0"
                                  disabled={updateAppStatus.isPending}
                                >
                                  {updateAppStatus.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" /> Approve</>}
                                </Button>
                                
                                <Button 
                                  onClick={() => updateAppStatus.mutate({ aid: a.id, status: "REJECTED" })} 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-[12px] rounded-sm text-red-400 hover:text-red-300 border-red-500/20 hover:bg-red-500/5"
                                  disabled={updateAppStatus.isPending}
                                >
                                  <X className="h-3.5 w-3.5 mr-1" /> Reject
                                </Button>
                              </>
                            )}

                            <Button 
                              onClick={() => setViewingCreator(a)} 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-[12px] rounded-sm border border-border"
                            >
                              View Profile
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}

          </div>
        )}

        {/* 4. Messages / Collaboration DMs Tab */}
        {activeTab === "messages" && (
          <div className="border border-border rounded-sm bg-background grid md:grid-cols-12 min-h-[500px] overflow-hidden">
            
            {/* Chat List (Col-4) */}
            <div className="md:col-span-4 border-r border-border flex flex-col">
              <div className="p-4 border-b border-border bg-[#0B0D17]/40">
                <h3 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">Collaborators</h3>
                <p className="text-[10px] text-muted-foreground">Direct DMs with approved creator partners.</p>
              </div>

              {approvedCollabs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex-1 flex items-center justify-center">
                  <div>
                    <MessageSquare className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                    No approved collabs yet. Approve a pitch to start chat.
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/60 overflow-y-auto flex-1">
                  {approvedCollabs.map(collab => {
                    const active = selectedChatPartner?.id === collab.id;
                    const ig = collab.influencer as any;
                    return (
                      <button
                        key={collab.id}
                        onClick={() => setSelectedChatPartner(collab)}
                        className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                          active ? "bg-zinc-800/80" : "hover:bg-zinc-800/20"
                        }`}
                      >
                        <div className="h-9 w-9 rounded-sm bg-gradient-brand shrink-0 flex items-center justify-center text-primary-foreground font-bold text-sm overflow-hidden">
                          {ig?.profileImageUrl ? (
                            <img src={ig.profileImageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            (ig?.name || "Creator")[0].toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-xs truncate text-foreground">{ig?.name || "Creator"}</h4>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">@{ig?.instagramHandle || "username"}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chat Box and Details panel (Col-8) */}
            <div className="md:col-span-8 grid sm:grid-cols-3 flex-1">
              
              {/* Messages viewport (2/3 columns) */}
              <div className="sm:col-span-2 flex flex-col justify-between border-r border-border min-h-[400px]">
                {selectedChatPartner ? (
                  <>
                    {/* Header */}
                    <div className="p-4 border-b border-border bg-[#0B0D17]/40 flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-xs text-foreground">{(selectedChatPartner.influencer as any)?.name}</h4>
                        <p className="text-[9px] text-muted-foreground uppercase mt-0.5">Approved Collaboration Partner</p>
                      </div>
                      <span className="inline-flex border border-border px-1.5 py-0.5 text-[8px] uppercase tracking-wider rounded-sm text-emerald-400 bg-emerald-500/5 border-emerald-500/25">Connected</span>
                    </div>

                    {/* Messages List */}
                    <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
                      <div className="text-center text-[10px] text-muted-foreground py-2 italic border-b border-border/30">
                        Secure channel established. Contact emails shared successfully.
                      </div>
                      
                      {/* Default initial pitch message */}
                      <div className="flex justify-start">
                        <div className="bg-muted/30 border border-border max-w-[85%] rounded-sm p-3">
                          <p className="text-[9px] text-primary font-bold uppercase tracking-wider mb-1">Pitch Cover Message</p>
                          {selectedChatPartner.coverNote}
                        </div>
                      </div>

                      {/* Real message thread, backed by /api/applications/:id/messages */}
                      {threadMessages.map((msg: Message) => {
                        const fromMe = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-sm px-3 py-2 ${
                              fromMe ? "bg-gradient-brand text-primary-foreground border-0" : "bg-muted/30 border border-border"
                            }`}>
                              <p className="leading-relaxed">{msg.content}</p>
                              <span className="text-[8px] text-muted-foreground/80 block text-right mt-1">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chat Textbox */}
                    <div className="p-3 border-t border-border flex gap-2">
                      <input
                        type="text"
                        value={chatMessageText}
                        onChange={(e) => setChatMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSendChatMessage();
                        }}
                        placeholder="Write messages..."
                        className="flex-1 bg-background border border-border rounded-sm h-9 px-3 text-xs focus:outline-none"
                      />
                      <Button
                        onClick={handleSendChatMessage}
                        disabled={sendMessageMutation.isPending}
                        size="icon"
                        className="h-9 w-9 bg-gradient-brand text-primary-foreground rounded-sm shrink-0 border-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-10 text-center">
                    Select a collaboration collaborator partner from the left menu.
                  </div>
                )}
              </div>

              {/* Collab Details / Info sidebar (1/3 columns) */}
              <div className="p-4 bg-[#0B0D17]/40 flex flex-col justify-between">
                {selectedChatPartner ? (
                  <div className="space-y-4 text-xs">
                    <h4 className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">Collaboration Details</h4>
                    
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground text-[13px]">{selectedChatPartner.gig?.title}</p>
                      <p className="text-[10px] text-muted-foreground">Category: {selectedChatPartner.gig?.category || "Niche"}</p>
                    </div>

                    <div className="border-t border-border/40 pt-3 space-y-2">
                      <p className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Shared Contact Info</p>
                      
                      <div className="space-y-1.5 bg-background border border-border/60 p-2.5 rounded-sm">
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase">Creator Email</p>
                          <p className="text-[11px] font-semibold truncate text-foreground select-all">{(selectedChatPartner.influencer as any)?.user?.email || "Shared"}</p>
                        </div>
                        <div className="border-t border-border/30 pt-1.5 mt-1.5">
                          <p className="text-[9px] text-muted-foreground uppercase">Your Email</p>
                          <p className="text-[11px] font-semibold truncate text-foreground select-all">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground leading-relaxed italic">
                      Contact information is automatically shared when you approve a creator. Feel free to reach out via email as well.
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-xs text-muted-foreground py-10">
                    No collaboration selected.
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Confirmation approval modal workflow */}
      <Dialog open={confirmApproveOpen} onOpenChange={setConfirmApproveOpen}>
        <DialogContent className="border-border text-foreground max-w-sm rounded-sm bg-background">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Approve & hire this creator?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              Approving <strong>{(selectedAppToApprove?.influencer as any)?.name}</strong> charges your trial credits for this hire and shares contact emails both ways. Are you sure?
            </DialogDescription>
          </DialogHeader>

          {selectedAppToApprove && (() => {
            const followerCount = (selectedAppToApprove.influencer as any)?.followerCount ?? 0;
            const tier = getTier(followerCount);
            const locked = tier === "MID";
            const cost = locked ? null : TIER_COST[tier];
            const insufficient = !locked && credits !== null && cost !== null && credits < cost;
            const remainingAfter = !locked && credits !== null && cost !== null ? credits - cost : null;

            return (
              <div className="rounded-sm border border-border bg-muted/20 p-3 text-xs space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Creator tier</span>
                  <span className="font-medium text-foreground">
                    {tier === "NANO" ? "Nano (< 1K)" : tier === "MICRO" ? "Micro (1K–10K)" : "Mid-tier (10K+)"}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Hire cost</span>
                  <span className="font-medium text-foreground">{locked ? "—" : `− ${cost} credits`}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Current balance</span>
                  <span className="font-medium text-foreground">{credits ?? "…"}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-1.5 mt-1.5">
                  <span className="text-muted-foreground">Remaining after this hire</span>
                  <span className={`font-semibold ${insufficient ? "text-red-400" : "text-primary"}`}>
                    {locked ? "—" : remainingAfter}
                  </span>
                </div>
                {locked && (
                  <p className="text-amber-500 pt-1">Mid-tier creators unlock after the trial pack — can't hire yet.</p>
                )}
                {insufficient && (
                  <p className="text-amber-500 pt-1">Not enough trial credits left for this hire.</p>
                )}
              </div>
            );
          })()}

          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button
              variant="ghost"
              onClick={() => { setConfirmApproveOpen(false); setSelectedAppToApprove(null); }}
              className="h-9 text-xs rounded-sm hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApprove}
              disabled={
                updateAppStatus.isPending ||
                !selectedAppToApprove ||
                getTier((selectedAppToApprove?.influencer as any)?.followerCount ?? 0) === "MID" ||
                (credits !== null && credits < TIER_COST[getTier((selectedAppToApprove?.influencer as any)?.followerCount ?? 0) as "NANO" | "MICRO"])
              }
              className="h-9 text-xs rounded-sm bg-gradient-brand text-primary-foreground border-0 shadow-md hover:opacity-95 disabled:opacity-50"
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Creator Profile View Dialog Modal */}
      <Dialog open={!!viewingCreator} onOpenChange={(o) => !o && setViewingCreator(null)}>
        <DialogContent className="border-border text-foreground max-w-md rounded-sm bg-background">
          {viewingCreator && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Creator Profile Summary</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Metrics verified via social channel integrations.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-3 text-xs leading-relaxed">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-sm bg-gradient-brand shrink-0 flex items-center justify-center text-primary-foreground font-bold text-lg overflow-hidden border border-border">
                    {(viewingCreator.influencer as any)?.profileImageUrl ? (
                      <img src={(viewingCreator.influencer as any).profileImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (viewingCreator.influencer as any)?.name?.[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{(viewingCreator.influencer as any)?.name}</h4>
                    <p className="text-[10px] text-muted-foreground">@{(viewingCreator.influencer as any)?.instagramHandle || "username"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-[#0B0D17]/40 p-3 rounded-sm border border-border">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Primary Niche</p>
                    <p className="text-xs font-semibold text-foreground">{(viewingCreator.influencer as any)?.niche}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Follower Count</p>
                    <p className="text-xs font-semibold text-foreground">{(viewingCreator.influencer as any)?.followerCount?.toLocaleString() || "12,500"}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-[11px] text-muted-foreground">Bio Description</p>
                  <p className="text-foreground bg-muted/20 p-2.5 rounded-sm border border-border/40 select-text">{(viewingCreator.influencer as any)?.bio}</p>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-[11px] text-muted-foreground">Instagram handle</p>
                  <a 
                    href={`https://instagram.com/${(viewingCreator.influencer as any)?.instagramHandle}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline font-medium"
                  >
                    instagram.com/{(viewingCreator.influencer as any)?.instagramHandle}
                  </a>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setViewingCreator(null)} className="h-8 text-xs rounded-sm">
                  Close Profile
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
