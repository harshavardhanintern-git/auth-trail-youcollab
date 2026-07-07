import { applicationsService, type Application } from "@/services/applications";
import {
  BadgeCheck, Check, X, ArrowLeft, MessageSquareText, Send, Loader2, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/common/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/dialog";
import { gigsService } from "@/services/gigs";
import { Input } from "@/components/common/input";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

function StatusPill({ s }: { s: Application["status"] }) {
  const cls = s === "ACCEPTED" ? "text-success" : s === "REJECTED" ? "text-destructive" : "text-warning";
  return <span className={`chip ${cls}`}>{s}</span>;
}

function ChatPanel({ app, onClose }: { app: Application | null; onClose: () => void }) {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState<{ from: "me" | "them"; text: string; at: number }[]>([
    { from: "them", text: app?.coverNote ?? "Hi!", at: Date.now() - 60000 },
  ]);
  const send = () => {
    if (!msg.trim()) return;
    setMessages((m) => [...m, { from: "me", text: msg, at: Date.now() }]);
    setMsg("");
  };
  return (
    <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong border-border max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-primary" />
            Chat with {app?.influencer?.name ?? "creator"}
          </DialogTitle>
        </DialogHeader>
        <div className="h-80 overflow-y-auto px-5 py-3 space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                m.from === "me" ? "bg-gradient-brand text-primary-foreground" : "glass"
              }`}>{m.text}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-3 flex gap-2">
          <Input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message…" className="glass" />
          <Button onClick={send} size="icon" className="bg-gradient-brand text-primary-foreground border-0"><Send className="h-4 w-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GigApplicants() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [chatApp, setChatApp] = useState<Application | null>(null);

  const { data: gig } = useQuery({ queryKey: ["gig", id], queryFn: () => gigsService.get(id), enabled: !!id });
  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["applications", "gig", id], queryFn: () => applicationsService.forGig(id), enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: ({ aid, status }: { aid: string; status: Application["status"] }) =>
      applicationsService.updateStatus(aid, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications", "gig", id] });
      toast({ title: "Status updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Update failed" }),
  });

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 neon-grid pointer-events-none" />
      <main className="relative mx-auto max-w-5xl px-4 py-8 space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2"><Link to="/dashboard/brand"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
        <div>
          <div className="chip mb-2">Applicants</div>
          <h1 className="text-3xl font-semibold">{gig?.title ?? "Gig"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{apps.length} creator{apps.length === 1 ? "" : "s"} pitched.</p>
        </div>

        {isLoading ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Loading applicants…</div>
        ) : apps.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">No applicants yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {apps.map((a) => {
                const ig = a.influencer?.instagram;
                return (
                  <motion.div
                    key={a.id} layout
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="glass glass-hover rounded-2xl p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-brand flex items-center justify-center text-primary-foreground font-semibold">
                        {(a.influencer?.name ?? "?")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{a.influencer?.name ?? "Creator"}</h3>
                          {ig?.isConnected && <span className="chip text-info"><BadgeCheck className="h-3 w-3" /> Verified</span>}
                          <StatusPill s={a.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{a.influencer?.niche ?? "Creator"}</p>
                        {a.influencer?.bio && <p className="text-sm mt-2 line-clamp-2">{a.influencer.bio}</p>}
                      </div>
                    </div>

                    {ig?.isConnected && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="glass rounded-xl p-2 text-center">
                          <p className="text-xs text-muted-foreground">Followers</p>
                          <p className="text-sm font-semibold">{(ig.followersCount ?? 0).toLocaleString()}</p>
                        </div>
                        <div className="glass rounded-xl p-2 text-center">
                          <p className="text-xs text-muted-foreground">Avg likes</p>
                          <p className="text-sm font-semibold">{(ig.averageLikes ?? 0).toLocaleString()}</p>
                        </div>
                        <div className="glass rounded-xl p-2 text-center">
                          <p className="text-xs text-muted-foreground">Engagement</p>
                          <p className="text-sm font-semibold inline-flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-primary" />
                            {ig.engagementRate ? `${ig.engagementRate.toFixed(1)}%` : "—"}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 glass rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-1">Cover note</p>
                      <p className="text-sm whitespace-pre-wrap">{a.coverNote}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm" disabled={updateStatus.isPending || a.status === "ACCEPTED"}
                        onClick={() => updateStatus.mutate({ aid: a.id, status: "ACCEPTED" })}
                        className="bg-gradient-brand text-primary-foreground border-0"
                      >
                        {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Accept</>}
                      </Button>
                      <Button
                        size="sm" variant="outline" disabled={updateStatus.isPending || a.status === "REJECTED"}
                        onClick={() => updateStatus.mutate({ aid: a.id, status: "REJECTED" })}
                        className="glass"
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setChatApp(a)}>
                        <MessageSquareText className="h-4 w-4 mr-1" /> Message
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
      <ChatPanel app={chatApp} onClose={() => setChatApp(null)} />
    </div>
  );
}
