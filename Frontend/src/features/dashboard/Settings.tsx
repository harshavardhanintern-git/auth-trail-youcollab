import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/common/accordion";
import { Button } from "@/components/common/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/common/dialog";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Link, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import { 
  Shield, 
  Bell, 
  Eye, 
  Sliders, 
  HelpCircle, 
  Key, 
  Mail, 
  Trash2, 
  BadgeCheck, 
  Loader2,
  Trash
} from "lucide-react";
import { Switch } from "@/components/common/switch";
import { useClerk } from "@clerk/clerk-react";
import { useAuthStore } from "@/stores/authStore";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

type TabType = 
  | "account" 
  | "notifications" 
  | "privacy" 
  | "preferences" 
  | "support";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuthStore();
  const { signOut } = useClerk();
  const [activeTab, setActiveTab] = useState<TabType>("account");

  // General loading states
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // 1. Account & Security Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // 2. Notification Preference States
  const [notifs, setNotifs] = useState({
    email: true,
    appUpdates: true,
    collabs: true,
    messages: true,
    marketing: false,
    digest: true,
  });

  // 3. Privacy Preference States
  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showFollowers: true,
    showContact: false,
    discoverable: true,
    searchVisible: true,
  });

  // 4. Connected Accounts States
  const [connections, setConnections] = useState({
    instagram: true,
    youtube: false,
    tiktok: false,
    linkedin: false,
  });

  // 5. Preferences States
  const [prefs, setPrefs] = useState({
    language: "en",
    timeZone: "IST",
    location: "Pune",
    category: "Cafe",
    dateFormat: "DD/MM/YYYY",
    theme: "dark",
  });

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedNotifs = localStorage.getItem("yc.settings.notifs");
    if (savedNotifs) setNotifs(JSON.parse(savedNotifs));

    const savedPrivacy = localStorage.getItem("yc.settings.privacy");
    if (savedPrivacy) setPrivacy(JSON.parse(savedPrivacy));

    const savedPrefs = localStorage.getItem("yc.settings.prefs");
    if (savedPrefs) setPrefs(JSON.parse(savedPrefs));

    const savedConnections = localStorage.getItem("yc.settings.connections");
    if (savedConnections) setConnections(JSON.parse(savedConnections));
  }, []);

  // Sync preference helpers
  const updateNotif = (key: keyof typeof notifs, value: boolean) => {
    const updated = { ...notifs, [key]: value };
    setNotifs(updated);
    localStorage.setItem("yc.settings.notifs", JSON.stringify(updated));
    toast({ title: "Notification preference updated" });
  };

  const updatePrivacy = (key: keyof typeof privacy, value: boolean) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    localStorage.setItem("yc.settings.privacy", JSON.stringify(updated));
    toast({ title: "Privacy preference updated" });
  };

  const updatePref = (key: keyof typeof prefs, value: string) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    localStorage.setItem("yc.settings.prefs", JSON.stringify(updated));
    toast({ title: "General preferences updated" });
  };

  // Account management actions
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ variant: "destructive", title: "Fill all password fields" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords mismatch", description: "New password and confirm password do not match." });
      return;
    }

    setLoadingAction("password");
    // Mock request
    setTimeout(() => {
      setLoadingAction(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated successfully! 🔐" });
    }, 1500);
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) {
      toast({ variant: "destructive", title: "Email is required" });
      return;
    }

    setLoadingAction("email");
    // Mock request
    setTimeout(() => {
      setLoadingAction(null);
      setNewEmail("");
      setIsEmailVerified(false);
      toast({ title: "Verification email sent! ✉️", description: "Please check your inbox to confirm the change." });
    }, 1500);
  };

  const handleVerifyEmailStatus = () => {
    if (isEmailVerified) return;
    setLoadingAction("verifyEmail");
    setTimeout(() => {
      setLoadingAction(null);
      setIsEmailVerified(true);
      toast({ title: "Email verified successfully!" });
    }, 1200);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast({ variant: "destructive", title: "Confirmation mismatch", description: 'Please type "DELETE" to confirm.' });
      return;
    }
    setIsDeleteModalOpen(false);
    try {
      // End the Clerk session.
      await signOut();
    } catch {
      /* clear local state regardless */
    }
    logout();
    toast({ title: "Account deleted permanently." });
    navigate("/");
  };

  // Nav categories layout
  const categories = [
    { id: "account", label: "Account & Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy Settings", icon: Eye },
    { id: "preferences", label: "Preferences", icon: Sliders },
    { id: "support", label: "Help & Support", icon: HelpCircle },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-[1200px] px-6 py-10 space-y-10">
        {/* Header matching dashboard */}
        <div>
          <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm mb-3">Workspace configuration</span>
          <h1 className="text-3xl font-semibold tracking-tight">Account Settings</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Manage security credentials, integrations, preferences, and support access.</p>
        </div>

        {/* Tab Navigation matching dashboard */}
        <div className="flex border-b border-border overflow-x-auto whitespace-nowrap scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`pb-3 text-sm font-semibold tracking-tight px-4 border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === cat.id 
                    ? "border-foreground text-foreground" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Setting Panel Contents matching gig/pitch card list of dashboard */}
        <div className="space-y-6">
          
          {/* 1. Account & Security Tab */}
          {activeTab === "account" && (
            <div className="grid md:grid-cols-2 gap-4">
              
              {/* Email settings card */}
              <div className="border border-border rounded-sm p-5 bg-background flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> Email settings</span>
                    {isEmailVerified ? (
                      <span className="inline-flex items-center gap-1 border border-emerald-500/25 px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded-sm text-emerald-400 bg-emerald-500/5">
                        <BadgeCheck className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <button 
                        onClick={handleVerifyEmailStatus} 
                        disabled={loadingAction === "verifyEmail"}
                        className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-yellow-500/25 text-yellow-500 hover:bg-yellow-500/10 rounded-sm"
                      >
                        {loadingAction === "verifyEmail" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify email"}
                      </button>
                    )}
                  </div>
                  
                  <h3 className="mt-3 text-[14px] font-semibold">Email Address</h3>
                  <p className="mt-1 text-[12px] text-muted-foreground">Your primary communication address: <span className="font-semibold text-foreground">{user?.email}</span></p>

                  <form onSubmit={handleChangeEmail} className="mt-4 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">New email address</Label>
                      <Input 
                        type="email" 
                        required
                        value={newEmail} 
                        onChange={(e) => setNewEmail(e.target.value)} 
                        placeholder="new-email@example.com" 
                        className="h-9 text-[13px] rounded-sm" 
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={loadingAction === "email"} 
                      className="w-full h-8 text-[12px] rounded-sm bg-gradient-brand text-primary-foreground border-0 shadow-md hover:opacity-95"
                    >
                      {loadingAction === "email" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Change Email"}
                    </Button>
                  </form>
                </div>
              </div>

              {/* Update Password card */}
              <div className="border border-border rounded-sm p-5 bg-background flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Key className="h-3 w-3" /> Password credentials</span>
                  </div>
                  
                  <h3 className="mt-3 text-[14px] font-semibold">Update Password</h3>
                  <p className="mt-1 text-[12px] text-muted-foreground">Change password security credentials periodically.</p>

                  <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[12px]">Current Password</Label>
                      <Input 
                        type="password" 
                        required
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                        placeholder="••••••••" 
                        className="h-9 text-[13px] rounded-sm" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[12px]">New Password</Label>
                      <Input 
                        type="password" 
                        required
                        minLength={6}
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        placeholder="••••••••" 
                        className="h-9 text-[13px] rounded-sm" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[12px]">Confirm New Password</Label>
                      <Input 
                        type="password" 
                        required
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        placeholder="••••••••" 
                        className="h-9 text-[13px] rounded-sm" 
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={loadingAction === "password"} 
                      className="w-full h-8 text-[12px] rounded-sm bg-gradient-brand text-primary-foreground border-0 shadow-md hover:opacity-95"
                    >
                      {loadingAction === "password" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Update Password"}
                    </Button>
                  </form>
                </div>
              </div>



              {/* Danger Zone */}
              <div className="border border-red-500/25 rounded-sm p-5 bg-red-500/5 md:col-span-2 flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-red-400">Danger Zone</h3>
                  <p className="text-[12px] text-red-400/70 mt-1">Permanently delete your profile data, campaign listings, application histories, and auth metadata.</p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="h-8 text-[12px] rounded-sm bg-red-600 hover:bg-red-500"
                >
                  <Trash className="h-3.5 w-3.5 mr-1" /> Delete Account
                </Button>
              </div>

            </div>
          )}

          {/* 2. Notification Preferences Tab */}
          {activeTab === "notifications" && (
            <div className="border border-border rounded-sm bg-background divide-y divide-border">
              
              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="notif-email">Email Notifications</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Receive primary workspace alerts directly in your inbox.</p>
                </div>
                <Switch id="notif-email" checked={notifs.email} onCheckedChange={(val) => updateNotif("email", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="notif-app">Application Status Updates</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Get notified when brief pitches are pending, accepted, or reviewed.</p>
                </div>
                <Switch id="notif-app" checked={notifs.appUpdates} onCheckedChange={(val) => updateNotif("appUpdates", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="notif-collab">New Collaboration Opportunities</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Hear about newly listed campaigns matching your location and niche.</p>
                </div>
                <Switch id="notif-collab" checked={notifs.collabs} onCheckedChange={(val) => updateNotif("collabs", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="notif-messages">Brand Messages</Label>
                    <span className="inline-flex border border-border px-1.5 py-0.2 text-[8px] uppercase tracking-wider text-muted-foreground rounded-sm">Future Ready</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Instant chat messaging notification alerts when brands message you.</p>
                </div>
                <Switch id="notif-messages" checked={notifs.messages} onCheckedChange={(val) => updateNotif("messages", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="notif-marketing">Marketing Emails</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Receive promo updates, partnership newsletters, and marketing materials.</p>
                </div>
                <Switch id="notif-marketing" checked={notifs.marketing} onCheckedChange={(val) => updateNotif("marketing", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="notif-digest">Weekly Digest</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Get a summarized review of trending Pune creators and campaign briefs.</p>
                </div>
                <Switch id="notif-digest" checked={notifs.digest} onCheckedChange={(val) => updateNotif("digest", val)} />
              </div>

            </div>
          )}

          {/* 3. Privacy Settings Tab */}
          {activeTab === "privacy" && (
            <div className="border border-border rounded-sm bg-background divide-y divide-border">
              
              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="priv-public">Profile Visibility (Public)</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Allow guests and search indexers to access your profile data.</p>
                </div>
                <Switch id="priv-public" checked={privacy.publicProfile} onCheckedChange={(val) => updatePrivacy("publicProfile", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="priv-followers">Show Follower Count</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Display verified social audience sizes on your cards.</p>
                </div>
                <Switch id="priv-followers" checked={privacy.showFollowers} onCheckedChange={(val) => updatePrivacy("showFollowers", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="priv-contact">Show Contact Information</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Allow brands/creators to see direct email details when pitch is accepted.</p>
                </div>
                <Switch id="priv-contact" checked={privacy.showContact} onCheckedChange={(val) => updatePrivacy("showContact", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="priv-discover">Discoverability</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Allow Pune brands to query your creator profile on the creator lookup directory.</p>
                </div>
                <Switch id="priv-discover" checked={privacy.discoverable} onCheckedChange={(val) => updatePrivacy("discoverable", val)} />
              </div>

              <div className="flex items-center justify-between p-5">
                <div>
                  <Label className="text-[14px] font-semibold text-foreground cursor-pointer" htmlFor="priv-search">Search Visibility</Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Allow users to search your brand/influencer handle inside marketplace search bars.</p>
                </div>
                <Switch id="priv-search" checked={privacy.searchVisible} onCheckedChange={(val) => updatePrivacy("searchVisible", val)} />
              </div>

            </div>
          )}

          {/* 4. Preferences Tab */}
          {activeTab === "preferences" && (
            <div className="border border-border rounded-sm p-6 bg-background space-y-4">
              <h3 className="text-[14px] font-semibold">General Preferences</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Language Selection</Label>
                  <Select value={prefs.language} onValueChange={(val) => updatePref("language", val)}>
                    <SelectTrigger className="h-9 text-[13px] rounded-sm bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English (UK)</SelectItem>
                      <SelectItem value="us">English (US)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px]">Time Zone</Label>
                  <Select value={prefs.timeZone} onValueChange={(val) => updatePref("timeZone", val)}>
                    <SelectTrigger className="h-9 text-[13px] rounded-sm bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IST">IST (GMT+5:30) - Pune</SelectItem>
                      <SelectItem value="GMT">GMT (GMT+0:00)</SelectItem>
                      <SelectItem value="EST">EST (GMT-5:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px]">Default City/Location</Label>
                  <Input value={prefs.location} onChange={(e) => updatePref("location", e.target.value)} className="h-9 text-[13px] rounded-sm" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px]">Default Gig Category</Label>
                  <Select value={prefs.category} onValueChange={(val) => updatePref("category", val)}>
                    <SelectTrigger className="h-9 text-[13px] rounded-sm bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cafe">Cafe</SelectItem>
                      <SelectItem value="Food">Food & Beverage</SelectItem>
                      <SelectItem value="Fashion">Fashion</SelectItem>
                      <SelectItem value="Fitness">Fitness & Wellness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px]">Date Format</Label>
                  <Select value={prefs.dateFormat} onValueChange={(val) => updatePref("dateFormat", val)}>
                    <SelectTrigger className="h-9 text-[13px] rounded-sm bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px]">Theme Preference</Label>
                  <Select value={prefs.theme} onValueChange={(val) => updatePref("theme", val)}>
                    <SelectTrigger className="h-9 text-[13px] rounded-sm bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark Theme</SelectItem>
                      <SelectItem value="light">Light Theme</SelectItem>
                      <SelectItem value="system">System Preference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>
          )}

          {/* 5. Help & Support Tab */}
          {activeTab === "support" && (
            <div className="grid md:grid-cols-3 gap-4">
              
              {/* Accordion list */}
              <div className="border border-border rounded-sm p-5 bg-background md:col-span-2 space-y-4">
                <h3 className="text-[14px] font-semibold">Frequently Asked Questions</h3>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-border">
                    <AccordionTrigger className="text-[13px] hover:no-underline font-semibold py-3 text-left">How do I verify my follower count?</AccordionTrigger>
                    <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed">
                      Link your Instagram Professional account via Meta API on the Profile page, and sync. Our system queries verified metrics securely from the Meta Graph API.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2" className="border-border">
                    <AccordionTrigger className="text-[13px] hover:no-underline font-semibold py-3 text-left">Are my messages with brands encrypted?</AccordionTrigger>
                    <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed">
                      Yes, all conversations are transmitted securely over HTTPS/TLS and saved in encrypted database tables inside Supabase. Only you and the brand can read them.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border-border">
                    <AccordionTrigger className="text-[13px] hover:no-underline font-semibold py-3 text-left">How long does brief review take?</AccordionTrigger>
                    <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed">
                      Campaign briefs are posted instantly once clicked. Brands will reach out directly on the platform by reviewing creator applications under their pitches panel.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Channels list */}
              <div className="flex flex-col gap-4">
                
                <div className="border border-border rounded-sm p-5 bg-background text-center space-y-2">
                  <h4 className="text-[13px] font-semibold">Contact Support</h4>
                  <p className="text-[11px] text-muted-foreground">Get help via email</p>
                  <div className="pt-1">
                    <a href="mailto:support@youcollab.in" className="inline-block text-[11px] font-semibold text-foreground hover:underline uppercase tracking-wider">Email Support</a>
                  </div>
                </div>

                <div className="border border-border rounded-sm p-5 bg-background text-center space-y-2">
                  <h4 className="text-[13px] font-semibold">Report a Problem</h4>
                  <p className="text-[11px] text-muted-foreground">Submit a bug log</p>
                  <div className="pt-1">
                    <button onClick={() => toast({ title: "Report submitted! Thank you. 📝" })} className="text-[11px] font-semibold text-foreground hover:underline uppercase tracking-wider">Report Bug</button>
                  </div>
                </div>

                <div className="border border-border rounded-sm p-5 bg-background text-center space-y-2">
                  <h4 className="text-[13px] font-semibold">Terms & Privacy</h4>
                  <p className="text-[11px] text-muted-foreground">Legal guidelines</p>
                  <div className="pt-1 flex justify-center gap-3">
                    <button onClick={() => toast({ title: "Showing Terms (Stub)" })} className="text-[11px] font-semibold text-foreground hover:underline uppercase tracking-wider">Terms</button>
                    <button onClick={() => toast({ title: "Showing Privacy Policy (Stub)" })} className="text-[11px] font-semibold text-foreground hover:underline uppercase tracking-wider">Privacy</button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </main>

      {/* Account Deletion Confirmation Dialog matching dashboard dialogue */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="border-border text-foreground max-w-sm rounded-sm bg-background">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-400">Delete Account Permanently?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              This action cannot be undone. This will permanently delete your user profile and all campaign mappings.
              Please type <strong className="text-foreground">DELETE</strong> below to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2.5">
            <Input 
              value={deleteConfirmText} 
              onChange={(e) => setDeleteConfirmText(e.target.value)} 
              placeholder='Type "DELETE"' 
              className="text-xs h-9 rounded-sm" 
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmText(""); }} className="h-9 text-xs rounded-sm hover:bg-zinc-800">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} className="h-9 text-xs rounded-sm bg-red-600 hover:bg-red-500">
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
