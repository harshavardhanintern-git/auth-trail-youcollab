import { ArrowRight, Sun, Moon, Shield, Target, MapPin, Sparkles, Users, CheckCircle2, TrendingUp, Lock, Minus, Plus, Coins } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { useTheme } from "next-themes";

/* ═══════════════════════════════════════════════════
   Trial Credit Calculator — same tier/cost model the
   backend enforces once a brand actually signs up
   (Backend/src/constants/credits.js): 500 credits,
   Nano 100cr, Micro 300cr, Mid-tier locked on the trial.
   ═══════════════════════════════════════════════════ */

const TRIAL_CREDITS = 500;
const TIER_COST = { nano: 100, micro: 300 } as const;
type Tier = keyof typeof TIER_COST;

const CreditCalculatorSection = () => {
  const [counts, setCounts] = useState<Record<Tier, number>>({ nano: 0, micro: 0 });

  const spent = counts.nano * TIER_COST.nano + counts.micro * TIER_COST.micro;
  const balance = TRIAL_CREDITS - spent;
  const percentLeft = (balance / TRIAL_CREDITS) * 100;

  const adjust = (tier: Tier, delta: number) => {
    setCounts((prev) => {
      const next = prev[tier] + delta;
      if (next < 0) return prev;
      const nextSpent = spent - prev[tier] * TIER_COST[tier] + next * TIER_COST[tier];
      if (nextSpent > TRIAL_CREDITS) return prev;
      return { ...prev, [tier]: next };
    });
  };

  const loadPreset = (nano: number, micro: number) => setCounts({ nano, micro });

  const status =
    balance === 0
      ? { text: "Perfect mix — all 500 credits put to work.", tone: "#4bd493" }
      : balance < TIER_COST.nano
      ? { text: "Balance too low for another hire.", tone: "#e4bd48" }
      : { text: "Add creators to see how far your trial pack goes.", tone: "rgba(255,255,255,0.5)" };

  const tiers: { id: Tier; label: string; range: string; badgeColor: string; locked?: boolean }[] = [
    { id: "nano", label: "Nano Creator", range: "< 1K followers", badgeColor: "#4bd493" },
    { id: "micro", label: "Micro Creator", range: "1K – 10K followers", badgeColor: "#5B8CFF" },
  ];

  const featuresRef = useRef(null);
  const inView = useInView(featuresRef, { once: true, margin: "-80px" });

  return (
    <section className="relative py-28 px-6 overflow-hidden" id="credits" style={{ background: "#0B0D13" }}>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: "10%", right: "-10%", width: "45%", height: "55%",
          background: "radial-gradient(ellipse, rgba(91,140,255,0.05) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      <div className="mx-auto max-w-[1100px] relative z-10">
        <motion.div
          ref={featuresRef}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-[#5B8CFF] font-semibold mb-4">
            No cost to start
          </p>
          <h2
            className="font-semibold tracking-[-0.03em] max-w-[560px] leading-[1.15] text-white"
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
          >
            500 free credits.
            <br />
            Zero commitment.
          </h2>
          <p className="mt-4 max-w-[480px] text-[14px] text-white/45 leading-relaxed">
            Every brand starts with a trial pack. Spend it hiring creators — see
            exactly how far it stretches before you type a single card number.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-12 gap-6 rounded-[24px] border border-white/[0.06] bg-[#12141C] p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
        >
          {/* Left: tier selectors */}
          <div className="md:col-span-7 space-y-3">
            {tiers.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-[#2353E9]/30 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white/90 text-[14px]">{t.label}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${t.badgeColor}1a`, color: t.badgeColor }}
                    >
                      {t.range}
                    </span>
                  </div>
                  <p className="text-[12px] text-white/40 mt-1">
                    <span className="font-semibold text-[#88a3ff]">{TIER_COST[t.id]} credits</span> per hire
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => adjust(t.id, -1)}
                    className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 transition-colors"
                    aria-label={`Remove one ${t.label}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-5 text-center font-bold text-white/90 tabular-nums">{counts[t.id]}</span>
                  <button
                    onClick={() => adjust(t.id, 1)}
                    className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 transition-colors"
                    aria-label={`Add one ${t.label}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Mid-tier, locked */}
            <div className="p-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.015] flex items-center justify-between opacity-60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white/50 text-[14px]">Mid-Tier Creator</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-white/5 text-white/40">
                    10K+ followers
                  </span>
                </div>
                <p className="text-[11px] text-white/30 mt-1">Unlocks after the trial pack</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/40 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                <Lock className="h-3 w-3" /> Locked
              </span>
            </div>

            {/* Presets */}
            <div className="pt-3 flex flex-wrap gap-2">
              <button onClick={() => loadPreset(2, 1)} className="text-[11px] font-medium px-3 py-1.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-[#2353E9]/40 transition-colors">
                1 Micro + 2 Nano
              </button>
              <button onClick={() => loadPreset(5, 0)} className="text-[11px] font-medium px-3 py-1.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-[#2353E9]/40 transition-colors">
                5 Nano
              </button>
              <button onClick={() => loadPreset(1, 1)} className="text-[11px] font-medium px-3 py-1.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-[#2353E9]/40 transition-colors">
                1 Nano + 1 Micro
              </button>
              <button onClick={() => loadPreset(0, 0)} className="text-[11px] font-medium px-3 py-1.5 rounded-full text-white/40 hover:text-white/70 ml-auto transition-colors">
                Reset
              </button>
            </div>
          </div>

          {/* Right: live balance */}
          <div className="md:col-span-5 rounded-2xl bg-gradient-to-br from-[#161A2B] to-[#0F111A] border border-white/[0.05] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40 font-semibold">
                <Coins className="h-3 w-3 text-[#5B8CFF]" /> Trial balance
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-4xl font-black tracking-tight tabular-nums" style={{ color: balance === 0 ? "#4bd493" : "white" }}>
                  {balance}
                </span>
                <span className="text-sm text-white/35 font-medium">/ {TRIAL_CREDITS} credits</span>
              </div>

              <div className="w-full bg-white/5 rounded-full h-2 mt-5 overflow-hidden">
                <motion.div
                  className="h-2 rounded-full"
                  style={{ background: balance === 0 ? "#4bd493" : "#2353E9" }}
                  animate={{ width: `${percentLeft}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>

              <div className="mt-6 space-y-2 text-[13px]">
                <div className="flex justify-between text-white/40">
                  <span>Nano allocation</span>
                  <span className="font-mono text-white/80 tabular-nums">{counts.nano * TIER_COST.nano} cr</span>
                </div>
                <div className="flex justify-between text-white/40">
                  <span>Micro allocation</span>
                  <span className="font-mono text-white/80 tabular-nums">{counts.micro * TIER_COST.micro} cr</span>
                </div>
                <div className="border-t border-white/[0.06] pt-2 flex justify-between font-semibold">
                  <span className="text-white/40">Total spent</span>
                  <span className="font-mono text-[#88a3ff] tabular-nums">{spent} cr</span>
                </div>
              </div>
            </div>

            <div
              className="mt-6 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[12px] text-center font-medium"
              style={{ color: status.tone }}
            >
              {status.text}
            </div>
          </div>
        </motion.div>

        <div className="mt-8 flex justify-center">
          <Link to="/register">
            <button className="group bg-[#2353E9] text-white rounded-full px-7 py-3 font-semibold text-[13px] shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 flex items-center gap-2">
              Claim your 500 credits
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════
   Floating Product Cards — Capsule-style hero cards
   ═══════════════════════════════════════════════════ */

const BrandCampaignCard = () => (
  <div className="bg-white/95 dark:bg-[#1A1A24] border border-[#2353E9]/[0.08] dark:border-white/[0.06] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.01),0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35),0_1px_4px_rgba(0,0,0,0.15)] p-5 w-[240px] relative overflow-hidden group hover:border-[#2353E9]/30 dark:hover:border-[#2353E9]/40 transition-all duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2353E9] to-indigo-500 flex items-center justify-center font-bold text-white text-[11px] shadow-sm">
          AA
        </div>
        <div>
          <h4 className="text-[11px] font-semibold text-slate-800 dark:text-white/80 leading-none">Aura Apparel</h4>
          <span className="text-[9px] text-slate-400 dark:text-white/40">Brand Partner</span>
        </div>
      </div>
      <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/25 px-2 py-0.5 rounded-full flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">Active</span>
      </div>
    </div>
    
    <div className="space-y-3">
      <div>
        <div className="text-[10px] text-slate-400 dark:text-white/40 uppercase tracking-wider font-medium">Campaign</div>
        <div className="text-[13px] font-semibold text-slate-800 dark:text-white/90">Summer Collection '26</div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
        <div>
          <div className="text-[9px] text-slate-400 dark:text-white/40">Budget</div>
          <div className="text-xs font-bold text-slate-800 dark:text-white/90">$3,200</div>
        </div>
        <div>
          <div className="text-[9px] text-slate-400 dark:text-white/40">Applications</div>
          <div className="text-xs font-bold text-[#2353E9] dark:text-[#88a3ff]">34 Pitches</div>
        </div>
      </div>
    </div>
  </div>
);

const AIMatchCard = () => (
  <div className="bg-white/95 dark:bg-[#1A1A24] border border-[#2353E9]/[0.08] dark:border-white/[0.06] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.01),0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35),0_1px_4px_rgba(0,0,0,0.15)] p-5 w-[220px] relative overflow-hidden group hover:border-[#2353E9]/30 dark:hover:border-[#2353E9]/40 transition-all duration-300">
    <div className="flex items-center mb-3">
      <span className="text-[10px] font-bold text-slate-500 dark:text-white/55 uppercase tracking-wider">AI Compatibility</span>
    </div>
    
    <div className="flex items-baseline gap-2 mb-3">
      <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#2353E9] to-[#5B8CFF] dark:from-[#2353E9] dark:to-[#88a3ff]">98%</span>
      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">High Match</span>
    </div>

    <div className="space-y-1.5 text-[10px] text-slate-500 dark:text-white/50 border-t border-slate-100 dark:border-white/[0.04] pt-2.5">
      <div className="flex items-center gap-1.5">
        <span className="w-1 h-1 rounded-full bg-[#2353E9]" />
        <span>Target demo matching</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-1 h-1 rounded-full bg-[#2353E9]" />
        <span>Authentic audience</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-1 h-1 rounded-full bg-[#2353E9]" />
        <span>Fashion/Lifestyle niche</span>
      </div>
    </div>
  </div>
);

const CreatorProfileCard = () => (
  <div className="bg-white/95 dark:bg-[#1A1A24] border border-[#2353E9]/[0.08] dark:border-white/[0.06] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.01),0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35),0_1px_4px_rgba(0,0,0,0.15)] p-5 w-[230px] relative overflow-hidden group hover:border-[#2353E9]/30 dark:hover:border-[#2353E9]/40 transition-all duration-300">
    <div className="flex items-center gap-3.5 mb-3.5">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2353E9] to-indigo-500 flex items-center justify-center font-bold text-white text-xs shadow-md">
          RS
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 bg-indigo-600 text-white rounded-full p-0.5 border border-white dark:border-[#1A1A24]">
          <CheckCircle2 className="w-2.5 h-2.5 text-white" />
        </div>
      </div>
      <div>
        <h4 className="text-[12px] font-semibold text-slate-800 dark:text-white/90 leading-none">Riya Sen</h4>
        <span className="text-[10px] text-[#2353E9] dark:text-[#88a3ff] font-medium mt-1 inline-block">@riyasen</span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2.5 border-t border-slate-100 dark:border-white/[0.04] pt-3 text-center">
      <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-2 border border-slate-100 dark:border-white/[0.02]">
        <div className="text-[9px] text-slate-400 dark:text-white/40 uppercase tracking-wider">Reach</div>
        <div className="text-xs font-bold text-slate-800 dark:text-white/90">142K</div>
      </div>
      <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-2 border border-slate-100 dark:border-white/[0.02]">
        <div className="text-[9px] text-slate-400 dark:text-white/40 uppercase tracking-wider">Engagement</div>
        <div className="text-xs font-bold text-slate-800 dark:text-white/90">6.4%</div>
      </div>
    </div>
  </div>
);

const AnalyticsCard = () => (
  <div className="bg-white/95 dark:bg-[#1A1A24] border border-[#2353E9]/[0.08] dark:border-white/[0.06] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.01),0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35),0_1px_4px_rgba(0,0,0,0.15)] p-5 w-[220px] relative overflow-hidden group hover:border-[#2353E9]/30 dark:hover:border-[#2353E9]/40 transition-all duration-300">
    <div className="flex items-center justify-between mb-3.5">
      <span className="text-[10px] font-semibold text-slate-400 dark:text-white/40 uppercase tracking-wider">Growth Analytics</span>
      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">Live</span>
    </div>
    
    <div className="grid grid-cols-2 gap-2 mb-3">
      <div>
        <div className="text-[9px] text-slate-400 dark:text-white/40">Total ROI</div>
        <div className="text-[15px] font-extrabold text-slate-800 dark:text-white">12.8x</div>
      </div>
      <div>
        <div className="text-[9px] text-slate-400 dark:text-white/40">Growth</div>
        <div className="text-[15px] font-extrabold text-emerald-500">+18.2%</div>
      </div>
    </div>

    <div className="h-10 w-full mt-2 relative">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="analytics-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2353E9" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2353E9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,35 Q15,38 30,22 T60,15 T90,5 L100,5 L100,40 L0,40 Z"
          fill="url(#analytics-grad)"
        />
        <path
          d="M0,35 Q15,38 30,22 T60,15 T90,5"
          fill="none"
          stroke="#2353E9"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="90" cy="5" r="3" fill="#2353E9" />
      </svg>
    </div>
  </div>
);

/* ═══════════════════════════════════════════
   Feature Card — Scroll-revealing glass card
   ═══════════════════════════════════════════ */

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay: number;
}

const FeatureItem = ({ icon, title, desc, delay }: FeatureItemProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className="group relative py-10 px-8"
    >
      {/* ── Icon ── */}
      <div
        className="mb-7 w-fit transition-all duration-300 ease-out
          group-hover:scale-[1.05] group-hover:-translate-y-1"
      >
        <div style={{ color: "#5B8CFF" }}>
          {icon}
        </div>
      </div>

      <h3 className="text-[15px] font-semibold tracking-tight mb-2 text-white/90">
        {title}
      </h3>
      <p className="text-[13px] text-white/45 leading-relaxed">{desc}</p>
    </motion.div>
  );
};

/* ═══════════════════════════════════════
   Main Landing Page
   ═══════════════════════════════════════ */

const Landing = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const featuresRef = useRef(null);
  const featuresInView = useInView(featuresRef, { once: true, margin: "-80px" });

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ═══ Floating Pill Navbar ═══ */}
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50" id="landing-nav">
        <div
          className="flex items-center gap-1 sm:gap-4
            bg-white/90 dark:bg-[#0B1120]/80
            backdrop-blur-2xl
            border border-gray-200/50 dark:border-white/10
            rounded-full pl-5 pr-2 py-2
            shadow-lg shadow-black/[0.06] dark:shadow-black/30"
        >
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Logo className="h-7 w-7 rounded-md" />
            <span className="text-sm font-bold text-gray-900 dark:text-white hidden sm:inline tracking-tight">
              YouCollab
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-6">
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="h-8 w-8 flex items-center justify-center rounded-full
                text-gray-500 dark:text-gray-400
                hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              title="Toggle theme"
              id="theme-toggle"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <Link to="/login">
              <button
                className="text-[13px] font-medium text-gray-600 dark:text-gray-300
                  hover:text-gray-900 dark:hover:text-white
                  px-3 py-1.5 rounded-full
                  hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                id="login-link"
              >
                Log in
              </button>
            </Link>
            <Link to="/register">
              <button
                className="text-[13px] font-semibold bg-[#2353E9] text-white
                  px-5 py-2 rounded-full
                  hover:bg-[#1d47cc] transition-all duration-200
                  shadow-md shadow-blue-500/20
                  hover:shadow-lg hover:shadow-blue-500/30"
                id="signup-btn"
              >
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ Hero Section ═══ */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16 transition-colors duration-500"
        id="hero"
        style={{
          backgroundColor: isDark ? "#16151D" : "#4FA3FF",
          background: isDark
            ? "#16151D"
            : "linear-gradient(180deg, #2D8CFF 0%, #4FA3FF 50%, #73B7FF 100%)",
        }}
      >
        {/* ── Layer 2: Cloud Image (Capsule-inspired Environmental Background) ── */}
        <div 
          className="absolute inset-0 pointer-events-none z-0 select-none transition-all duration-700"
          style={{
            opacity: isDark ? 0.08 : 0.22,
            backgroundImage: "url('/clouds.png')",
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* ── Layer 3: Blue Ambient Glow (above clouds) ── */}
        {isDark && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Radial blue glow behind the headline */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen"
              style={{
                width: "60vw",
                height: "60vw",
                maxWidth: "750px",
                maxHeight: "750px",
                background: "radial-gradient(circle, rgba(35,83,233,0.18), transparent 70%)",
                filter: "blur(90px)",
              }}
            />
            {/* Subtle blue ambient lighting */}
            <div
              className="absolute bottom-0 left-[20%] rounded-full opacity-35"
              style={{
                width: "30vw",
                height: "30vw",
                background: "radial-gradient(circle, rgba(91,140,255,0.08) 0%, transparent 70%)",
                filter: "blur(60px)",
              }}
            />
            <div
              className="absolute bottom-0 right-[20%] rounded-full opacity-35"
              style={{
                width: "30vw",
                height: "30vw",
                background: "radial-gradient(circle, rgba(91,140,255,0.08) 0%, transparent 70%)",
                filter: "blur(60px)",
              }}
            />
          </div>
        )}

        {/* ── Main Hero Layout Wrapper ── */}
        <div className="relative w-full max-w-[1250px] min-h-[580px] flex flex-col items-center justify-center z-10 px-4 mt-8">
          
          {/* Orbital path connections (Desktop only) */}
          <div className="hidden md:block absolute inset-0 pointer-events-none z-0">
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 1200 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="orbit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2353E9" stopOpacity="0.04" />
                  <stop offset="50%" stopColor="#2353E9" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#5B8CFF" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              <ellipse
                cx="600"
                cy="300"
                rx="480"
                ry="210"
                stroke="url(#orbit-grad)"
                strokeWidth="1.5"
                strokeDasharray="8 6"
                style={{
                  animation: "orbit-dash 40s linear infinite",
                }}
              />
              <ellipse
                cx="600"
                cy="300"
                rx="440"
                ry="180"
                stroke="rgba(35,83,233,0.06)"
                strokeWidth="1"
                strokeDasharray="4 8"
                opacity="0.6"
              />
            </svg>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes orbit-dash {
                to {
                  stroke-dashoffset: -100;
                }
              }
            `}} />
          </div>

          {/* Desktop Floating Cards */}
          {/* Top Left: AI Match Card (Card 2) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, y: [10, -10, 10] }}
            transition={{ 
              opacity: { duration: 0.8, delay: 0.3 },
              scale: { duration: 0.8, delay: 0.3 },
              y: { duration: 8, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute left-0 top-[10%] z-20 hidden md:block"
          >
            <AIMatchCard />
          </motion.div>

          {/* Bottom Left: Brand Campaign Card (Card 1) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, y: [-12, 12, -12] }}
            transition={{ 
              opacity: { duration: 0.8, delay: 0.4 },
              scale: { duration: 0.8, delay: 0.4 },
              y: { duration: 7, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute left-[3%] bottom-[8%] z-20 hidden md:block"
          >
            <BrandCampaignCard />
          </motion.div>

          {/* Top Right: Creator Profile Card (Card 3) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, y: [-8, 8, -8] }}
            transition={{ 
              opacity: { duration: 0.8, delay: 0.5 },
              scale: { duration: 0.8, delay: 0.5 },
              y: { duration: 6.5, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute right-0 top-[8%] z-20 hidden md:block"
          >
            <CreatorProfileCard />
          </motion.div>

          {/* Bottom Right: Analytics Card (Card 4) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, y: [14, -14, 14] }}
            transition={{ 
              opacity: { duration: 0.8, delay: 0.6 },
              scale: { duration: 0.8, delay: 0.6 },
              y: { duration: 9, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute right-[3%] bottom-[8%] z-20 hidden md:block"
          >
            <AnalyticsCard />
          </motion.div>

          {/* Center Content: Headline, Subtitle, CTA */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-[650px] mx-auto py-12">
            {/* ── Hero Headline ── */}
            <motion.div
              initial={{ opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 text-center mb-2"
            >
              <h1
                className="font-semibold leading-[1.05] tracking-[-0.035em] text-white"
                style={{
                  fontSize: "clamp(2.8rem, 7.5vw, 5.5rem)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  textShadow: isDark ? "0 4px 60px rgba(0,0,0,0.15)" : "0 4px 30px rgba(0,0,0,0.03)",
                }}
              >
                Where Brands
                <br />
                Meet{" "}
                <span
                  className="text-transparent bg-clip-text select-none"
                  style={{
                    backgroundImage: "linear-gradient(to bottom, #4D7BFF 0%, #2353E9 50%, #1C44C5 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    textShadow: "0 1px 0 #1C44C5, 0 2.5px 0 #1333A0, 0 8px 24px rgba(35,83,233,0.12), 0 2px 4px rgba(0,0,0,0.08)",
                  }}
                >
                  Creators
                </span>
              </h1>
            </motion.div>

            {/* ── Subtitle ── */}
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              className="relative z-10 text-center text-white/80 dark:text-white/55 max-w-[420px] mb-10 leading-relaxed"
              style={{ fontSize: "clamp(0.9rem, 2.2vw, 1.1rem)" }}
            >
              Everything related to influencer collabs
              <br />
              stored in one place. Never miss a campaign.
            </motion.p>

            {/* ── CTA Button ── */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
              className="relative z-10"
            >
              <Link to="/register">
                <button
                  className="group bg-white text-[#2353E9] rounded-full px-8 py-3.5
                    font-semibold text-sm
                    shadow-xl shadow-black/[0.08]
                    hover:shadow-2xl hover:shadow-black/[0.15]
                    hover:scale-[1.04] active:scale-[0.98]
                    transition-all duration-300
                    flex items-center gap-2"
                  id="hero-cta"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </Link>
            </motion.div>
          </div>

          {/* Mobile/Tablet Connected Stack (displays vertically below CTA) */}
          <div className="flex flex-col items-center gap-6 md:hidden w-full max-w-[340px] mx-auto mt-8 z-20">
            <div className="w-px h-8 bg-slate-300 dark:bg-white/10" />
            <BrandCampaignCard />
            <div className="w-px h-8 bg-slate-300 dark:bg-white/10" />
            <AIMatchCard />
            <div className="w-px h-8 bg-slate-300 dark:bg-white/10" />
            <CreatorProfileCard />
            <div className="w-px h-8 bg-slate-300 dark:bg-white/10" />
            <AnalyticsCard />
          </div>
        </div>
      </section>

      {/* ═══ Features Section ═══ */}
      <section
        className="relative py-28 px-6 overflow-hidden"
        id="features"
        style={{ background: "#0F1115" }}
      >
        {/* ── Radial gradient accents ── */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute rounded-full"
            style={{
              top: "-20%", left: "-10%",
              width: "50%", height: "60%",
              background: "radial-gradient(ellipse, rgba(91,140,255,0.04) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              bottom: "-15%", right: "-5%",
              width: "40%", height: "50%",
              background: "radial-gradient(ellipse, rgba(91,140,255,0.03) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
        </div>

        {/* ── Noise texture overlay ── */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px 128px",
          }}
        />

        <div className="mx-auto max-w-[1100px] relative z-10">
          {/* Section header */}
          <motion.div
            ref={featuresRef}
            initial={{ opacity: 0, y: 30 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-16"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#5B8CFF] font-semibold mb-4">
              Built for Pune
            </p>
            <h2
              className="font-semibold tracking-[-0.03em] max-w-[500px] leading-[1.15] text-white"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
            >
              Less DMs.
              <br />
              More deals.
            </h2>
          </motion.div>

          {/* Feature columns with vertical dividers */}
          <div className="grid grid-cols-1 md:grid-cols-3 relative">
            {/* Vertical dividers — desktop only */}
            <div className="hidden md:block absolute top-0 bottom-0 left-1/3 w-px bg-white/[0.06]" />
            <div className="hidden md:block absolute top-0 bottom-0 left-2/3 w-px bg-white/[0.06]" />

            {/* Horizontal dividers — mobile only */}
            <div className="block md:hidden" />

            <FeatureItem
              icon={
                <Shield
                  className="h-7 w-7"
                  style={{ color: "#5B8CFF", fill: "none", strokeWidth: 2.25 }}
                />
              }
              title="Verified Instagram"
              desc="Every creator connects their real Instagram. Followers, engagement, reach — checked, not claimed. Brands see what they're paying for."
              delay={0.1}
            />

            {/* Mobile divider */}
            <div className="block md:hidden h-px bg-white/[0.06] mx-8" />

            <FeatureItem
              icon={
                <Target
                  className="h-7 w-7"
                  style={{ color: "#5B8CFF", fill: "none", strokeWidth: 2.25 }}
                />
              }
              title="Structured Pitches"
              desc="Apply, negotiate, accept, deliver. Every step leaves a trail. No 'sent you a DM bro' — just a clear pipeline."
              delay={0.2}
            />

            {/* Mobile divider */}
            <div className="block md:hidden h-px bg-white/[0.06] mx-8" />

            <FeatureItem
              icon={
                <MapPin
                  className="h-7 w-7"
                  style={{ color: "#5B8CFF", fill: "none", strokeWidth: 2.25 }}
                />
              }
              title="Real Pune Reach"
              desc="Filter by area, category, and audience. Find the FC Road foodies or Kothrud fashion crowd that actually convert."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* ═══ Trial Credit Calculator ═══ */}
      <CreditCalculatorSection />

      {/* ═══ Social Proof ═══ */}
      <section className="py-24 px-6 bg-muted/30" id="social-proof">
        <div className="mx-auto max-w-[800px]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="p-10 sm:p-12 rounded-2xl bg-card border border-border shadow-sm"
          >
            <blockquote
              className="font-medium leading-[1.6] text-foreground/85"
              style={{ fontSize: "clamp(1rem, 2.5vw, 1.35rem)" }}
            >
              "Found three Pune creators in a week — all delivered on time, all
              drove walk-ins. Cost less than one Insta agency call."
            </blockquote>
            <div className="mt-8 flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-xs bg-primary/15 text-primary font-semibold">
                  AD
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-semibold">Aarav Deshpande</div>
                <div className="text-xs text-muted-foreground">
                  Owner, Brew Lab · Koregaon Park
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ Bottom CTA ═══ */}
      <section
        className="relative py-32 px-6 overflow-hidden"
        id="bottom-cta"
        style={{
          background: isDark
            ? "linear-gradient(180deg, #0f1a4a 0%, #080c24 100%)"
            : "linear-gradient(180deg, #2353E9 0%, #1B3FCC 100%)",
        }}
      >
        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute rounded-full"
            style={{
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "60%", height: "90%",
              background: isDark
                ? "radial-gradient(ellipse, rgba(35,83,233,0.12) 0%, transparent 70%)"
                : "radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
        </div>

        <div className="mx-auto max-w-[600px] text-center relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-semibold tracking-[-0.03em] text-white leading-[1.1]"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Your next collab isn't going to find itself.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="mt-5 text-[15px] text-white/45 max-w-[400px] mx-auto leading-relaxed"
          >
            Two minutes to set up. No credit card. No agency middleman.
            <br />
            Just real Pune collabs, starting now.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="mt-10 flex justify-center"
          >
            <Link to="/register">
              <button
                className="group bg-white text-[#2353E9] rounded-full px-8 py-3.5
                  font-semibold text-sm
                  shadow-xl shadow-black/[0.08]
                  hover:shadow-2xl hover:shadow-black/[0.15]
                  hover:scale-[1.04] active:scale-[0.98]
                  transition-all duration-300
                  flex items-center gap-2.5"
                id="bottom-cta-btn"
              >
                Start Collabing Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-border bg-background" id="footer">
        <div className="mx-auto max-w-[1100px] px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6 rounded-sm" />
            <span className="text-xs font-semibold text-muted-foreground tracking-tight">
              YouCollab
            </span>
          </div>
          <span className="text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} YouCollab
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
