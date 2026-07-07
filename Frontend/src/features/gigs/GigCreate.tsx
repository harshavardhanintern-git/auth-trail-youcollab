import { Button } from "@/components/common/button";
import { CATEGORIES } from "@/constants";
import { gigsService } from "@/services/gigs";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import { Textarea } from "@/components/common/textarea";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function GigCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  // Field states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Cafe");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [campaignType, setCampaignType] = useState("Paid Collab");
  const [requirements, setRequirements] = useState("");
  const [budgetMin, setBudgetMin] = useState<number | "">("");
  const [budgetMax, setBudgetMax] = useState<number | "">("");
  const [deadline, setDeadline] = useState("");
  const [city, setCity] = useState("Pune");

  // Inline validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: (status: "OPEN" | "CLOSED" = "OPEN") => {
      const payload = {
        title, 
        description, 
        deliverables, 
        creatorRequirements: requirements,
        platform, 
        campaignType,
        category, 
        city, 
        deadline,
        budgetMin: budgetMin !== "" ? Number(budgetMin) : 0,
        budgetMax: budgetMax !== "" ? Number(budgetMax) : 0,
        status,
      };

      console.log("[Create Gig Debug] Current User Session:", user);
      console.log("[Create Gig Debug] Submitting Payload:", JSON.stringify(payload));
      
      return gigsService.create(payload as any);
    },
    onSuccess: (data) => {
      console.log("[Create Gig Debug] Success Supabase response:", data);
      qc.invalidateQueries({ queryKey: ["gigs"] });
      toast({ title: data.status === "CLOSED" ? "Gig saved as draft 📁" : "Gig published successfully! 🚀" });
      navigate("/dashboard/brand");
    },
    onError: (e: any) => {
      console.error("[Create Gig Debug] Supabase error detail:", e);
      const serverMsg = e?.response?.data?.error?.message ?? e?.response?.data?.message ?? "Database insert failed.";
      
      // Map server-side Zod errors to inline fields if possible
      if (serverMsg.includes("Validation failed:")) {
        const errorDetail = serverMsg.replace("Validation failed: ", "");
        const parsedErrors: Record<string, string> = {};
        
        errorDetail.split(",").forEach((errStr: string) => {
          const parts = errStr.split(":");
          if (parts.length >= 2) {
            const field = parts[0].trim();
            const msg = parts.slice(1).join(":").trim();
            parsedErrors[field] = msg;
          }
        });
        
        if (Object.keys(parsedErrors).length > 0) {
          setErrors(prev => ({ ...prev, ...parsedErrors }));
        }
      }
      
      toast({ 
        variant: "destructive", 
        title: "Couldn't post gig", 
        description: serverMsg 
      });
    },
  });

  const handlePostGig = (status: "OPEN" | "CLOSED" = "OPEN") => {
    // Step 6: Verify User and Brand Role
    console.log("[Create Gig Debug] Verifying Brand user authentication...");
    if (!user) {
      toast({ variant: "destructive", title: "Authentication required", description: "You must be logged in to post gigs." });
      return;
    }
    if (user.role !== "BRAND") {
      toast({ variant: "destructive", title: "Permission denied", description: "Only users onboarded as brands can list collabs." });
      return;
    }

    // Step 2 & 3: Perform client-side validation
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = "This field is required.";
    } else if (title.length < 5) {
      newErrors.title = "Title must be at least 5 characters long.";
    } else if (title.length > 100) {
      newErrors.title = "Title is too long.";
    }

    if (!category) {
      newErrors.category = "Please select a category.";
    }

    if (!platform) {
      newErrors.platform = "Please select a platform.";
    }

    if (!campaignType) {
      newErrors.campaignType = "Please select a campaign type.";
    }

    if (!deadline) {
      newErrors.deadline = "This field is required.";
    } else {
      const selectedDate = new Date(deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.deadline = "Deadline cannot be in the past.";
      }
    }

    if (!description.trim()) {
      newErrors.description = "This field is required.";
    } else if (description.length < 20) {
      newErrors.description = "Description must contain at least 20 characters.";
    }

    if (!deliverables.trim()) {
      newErrors.deliverables = "This field is required.";
    }

    if (!requirements.trim()) {
      newErrors.requirements = "This field cannot be empty.";
    }

    if (budgetMin === "") {
      newErrors.budgetMin = "This field is required.";
    } else if (Number(budgetMin) <= 0) {
      newErrors.budgetMin = "Minimum budget must be greater than 0.";
    }

    if (budgetMax === "") {
      newErrors.budgetMax = "This field is required.";
    } else if (Number(budgetMax) <= 0) {
      newErrors.budgetMax = "Maximum budget must be greater than 0.";
    } else if (budgetMin !== "" && Number(budgetMax) <= Number(budgetMin)) {
      newErrors.budgetMax = "Budget Max must be greater than Budget Min.";
    }

    setErrors(newErrors);
    console.log("[Create Gig Debug] Client validation result:", newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast({ variant: "destructive", title: "Validation failed", description: "Please correct the highlighted fields." });
      return;
    }

    create.mutate(status);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
        
        {/* Back Link */}
        <div>
          <Button onClick={() => navigate("/dashboard/brand")} variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground h-8 text-[12px] rounded-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>

        {/* Header Section matching Dashboard layout */}
        <div>
          <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm mb-3">Post brief</span>
          <h1 className="text-3xl font-semibold tracking-tight">Create a Gig</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Creators in Pune can search and apply within minutes.</p>
        </div>

        {/* Content card matching Dashboard container */}
        <div className="border border-border rounded-sm p-6 bg-background space-y-5">
          
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Gig Title</Label>
            <Input 
              value={title} 
              onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors(prev => ({ ...prev, title: "" })); }} 
              placeholder="Reel collab for new espresso launch" 
              className={`h-9 text-[13px] rounded-sm ${errors.title ? "border-red-500 focus-visible:ring-red-500" : ""}`} 
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Category, Platform, Campaign Type */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Category</Label>
              <Select value={category} onValueChange={(val) => { setCategory(val); if (errors.category) setErrors(prev => ({ ...prev, category: "" })); }}>
                <SelectTrigger className={`h-9 text-[13px] rounded-sm bg-background border-border ${errors.category ? "border-red-500" : ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[12px]">Platform</Label>
              <Select value={platform} onValueChange={(val) => { setPlatform(val); if (errors.platform) setErrors(prev => ({ ...prev, platform: "" })); }}>
                <SelectTrigger className={`h-9 text-[13px] rounded-sm bg-background border-border ${errors.platform ? "border-red-500" : ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="YouTube">YouTube</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
              {errors.platform && <p className="text-red-500 text-xs mt-1">{errors.platform}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px]">Campaign Type</Label>
              <Select value={campaignType} onValueChange={(val) => { setCampaignType(val); if (errors.campaignType) setErrors(prev => ({ ...prev, campaignType: "" })); }}>
                <SelectTrigger className={`h-9 text-[13px] rounded-sm bg-background border-border ${errors.campaignType ? "border-red-500" : ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid Collab">Paid Collab</SelectItem>
                  <SelectItem value="Barter Collab">Barter Collab</SelectItem>
                  <SelectItem value="Sponsorship">Sponsorship</SelectItem>
                </SelectContent>
              </Select>
              {errors.campaignType && <p className="text-red-500 text-xs mt-1">{errors.campaignType}</p>}
            </div>
          </div>

          {/* Location & Deadline */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Location (Optional)</Label>
              <Input 
                value={city} 
                onChange={(e) => { setCity(e.target.value); if (errors.city) setErrors(prev => ({ ...prev, city: "" })); }} 
                placeholder="Pune" 
                className="h-9 text-[13px] rounded-sm" 
              />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px]">Deadline</Label>
              <Input 
                type="date" 
                value={deadline} 
                onChange={(e) => { setDeadline(e.target.value); if (errors.deadline) setErrors(prev => ({ ...prev, deadline: "" })); }} 
                className={`h-9 text-[13px] rounded-sm cursor-pointer ${errors.deadline ? "border-red-500 focus-visible:ring-red-500" : ""}`} 
              />
              {errors.deadline && <p className="text-red-500 text-xs mt-1">{errors.deadline}</p>}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Description</Label>
            <Textarea 
              value={description} 
              onChange={(e) => { setDescription(e.target.value); if (errors.description) setErrors(prev => ({ ...prev, description: "" })); }} 
              rows={4} 
              placeholder="What is the goal of this campaign? (Minimum 20 characters)" 
              className={`text-[13px] rounded-sm ${errors.description ? "border-red-500 focus-visible:ring-red-500" : ""}`} 
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Deliverables */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Deliverables</Label>
            <Textarea 
              value={deliverables} 
              onChange={(e) => { setDeliverables(e.target.value); if (errors.deliverables) setErrors(prev => ({ ...prev, deliverables: "" })); }} 
              rows={3} 
              placeholder="e.g. 1 reel + 3 stories within 7 days" 
              className={`text-[13px] rounded-sm ${errors.deliverables ? "border-red-500 focus-visible:ring-red-500" : ""}`} 
            />
            {errors.deliverables && <p className="text-red-500 text-xs mt-1">{errors.deliverables}</p>}
          </div>

          {/* Creator Requirements */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Creator Requirements</Label>
            <Textarea 
              value={requirements} 
              onChange={(e) => { setRequirements(e.target.value); if (errors.requirements) setErrors(prev => ({ ...prev, requirements: "" })); }} 
              rows={2} 
              placeholder="e.g. Min 5k followers, Pune base, fashion niche" 
              className={`text-[13px] rounded-sm ${errors.requirements ? "border-red-500 focus-visible:ring-red-500" : ""}`} 
            />
            {errors.requirements && <p className="text-red-500 text-xs mt-1">{errors.requirements}</p>}
          </div>

          {/* Budget min & Budget max */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Budget min (₹)</Label>
              <Input 
                type="number" 
                min={0} 
                value={budgetMin} 
                onChange={(e) => { setBudgetMin(e.target.value === "" ? "" : Number(e.target.value)); if (errors.budgetMin) setErrors(prev => ({ ...prev, budgetMin: "" })); }} 
                className={`h-9 text-[13px] rounded-sm ${errors.budgetMin ? "border-red-500 focus-visible:ring-red-500" : ""}`} 
              />
              {errors.budgetMin && <p className="text-red-500 text-xs mt-1">{errors.budgetMin}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Budget max (₹)</Label>
              <Input 
                type="number" 
                min={0} 
                value={budgetMax} 
                onChange={(e) => { setBudgetMax(e.target.value === "" ? "" : Number(e.target.value)); if (errors.budgetMax) setErrors(prev => ({ ...prev, budgetMax: "" })); }} 
                className={`h-9 text-[13px] rounded-sm ${errors.budgetMax ? "border-red-500 focus-visible:ring-red-500" : ""}`} 
              />
              {errors.budgetMax && <p className="text-red-500 text-xs mt-1">{errors.budgetMax}</p>}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-end gap-2.5 pt-2">
            <Button 
              disabled={create.isPending} 
              onClick={() => handlePostGig("CLOSED")} 
              variant="outline"
              className="h-9 text-[13px] rounded-sm"
            >
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save as Draft"}
            </Button>
            
            <Button 
              disabled={create.isPending} 
              onClick={() => handlePostGig("OPEN")} 
              className="h-9 text-[13px] rounded-sm bg-gradient-brand text-primary-foreground border-0 shadow-md hover:opacity-95"
            >
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
            </Button>
          </div>
        </div>

      </main>
    </div>
  );
}
