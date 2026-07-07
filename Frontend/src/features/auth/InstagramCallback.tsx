import { Button } from "@/components/common/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { instagramService } from "@/services/instagram";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function InstagramCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setStatus("error"); setMessage("Missing OAuth params."); return;
    }
    (async () => {
      try {
        await instagramService.callback(code, state);
        setStatus("success");
      } catch (e) {
        setStatus("error");
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Connection failed";
        setMessage(msg);
      }
    })();
  }, [params]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 neon-grid pointer-events-none" />
      <Navbar />
      <main className="relative mx-auto max-w-md px-4 pt-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-3xl p-8 text-center">
          {status === "loading" && (<>
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <h1 className="mt-4 text-xl font-semibold">Linking your Instagram…</h1>
            <p className="text-sm text-muted-foreground mt-1">This should only take a second.</p>
          </>)}
          {status === "success" && (<>
            <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
            <h1 className="mt-4 text-xl font-semibold">Instagram connected ✨</h1>
            <p className="text-sm text-muted-foreground mt-1">Your metrics are syncing.</p>
            <Button className="mt-5 bg-gradient-brand text-primary-foreground border-0" onClick={() => navigate("/dashboard/influencer")}>
              Go to dashboard
            </Button>
          </>)}
          {status === "error" && (<>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">Couldn't connect</h1>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
            <Button variant="outline" className="mt-5 glass" onClick={() => navigate("/dashboard/influencer")}>Back to dashboard</Button>
          </>)}
        </motion.div>
      </main>
    </div>
  );
}
