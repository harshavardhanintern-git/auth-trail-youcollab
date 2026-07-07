import { Button } from "@/components/common/button";
import { CATEGORIES } from "@/constants";
import { gigsService } from "@/services/gigs";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import { Textarea } from "@/components/common/textarea";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function GigEdit() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuthStore();

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

  // Inline errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: gig, isLoading } = useQuery({
    queryKey: ["gig", id],
    queryFn: () => gigsService.get(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (gig) {
      setTitle(gig.title || "");
      setCategory(gig.category || "Cafe");
      setDescription(gig.description || "");
      setDeliverables(gig.deliverables || "");
      setPlatform(gig.platform || "Instagram");
      setCampaignType(gig.campaignType || "Paid Collab");
      setRequirements(gig.creatorRequirements || "");
      setBudgetMin(gig.budgetMin ?? "");
      setBudgetMax(gig.budgetMax ?? "");
      if (gig.deadline) {
        setDeadline(new Date(gig.deadline).toISOString().split("T")[0]);
      }
      setCity(gig.city || "Pune");
    }
  }, [gig]);

  const update = useMutation({
    mutationFn: () => {
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
        budgetMax: budgetMax !== "" ? Number(budgetMax) : null,
      };
      console.log("[Edit Gig Debug] Session user:", user);
      console.log("[Edit Gig Debug] Submitting Update Payload:", JSON.stringify(payload));
      return gigsService.update(id, payload);
    },
    onSuccess: () => {
      console.log("[Edit Gig Debug] Success response");
      qc.invalidateQueries({ queryKey: ["gigs"] });
      qc.invalidateQueries({ queryKey: ["gig", id] });
      toast({ title: "Brief updated successfully! ✨" });
      navigate("/dashboard/brand");
    },
    onError: (e: any) => {
      console.error("[Edit Gig Debug] Supabase error:", e);
      const serverMsg = e?.response?.data?.error?.message ?? e?.response?.data?.message ?? "Update failed.";
      
      // Parse validation errors from server
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
      
      toast({ variant: "destructive", title: "Couldn't update brief", description: serverMsg });
    },
  });

  const handleUpdate = () => {
    // Client-side validations
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
    console.log("[Edit Gig Debug] Client validation result:", newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast({ variant: "destructive", title: "Validation failed", description: "Please correct the highlighted fields." });
      return;
    }

    update.mutate();
  };

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
        <div className="mb-4">
          <Button onClick={() => navigate("/dashboard/brand")} variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm mb-3">Edit brief</span>
          <h1 className="text-3xl font-semibold">Edit your gig</h1>
          <p className="text-sm text-muted-foreground mt-1">Update parameters for creators in Pune.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="border border-border rounded-sm p-6 bg-background space-y-5">
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

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Location (Optional)</Label>
              <Input 
                value={city} 
                onChange={(e) => { setCity(e.target.value); if (errors.city) setErrors(prev => ({ ...prev, city: "" })); }} 
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

          <div className="flex justify-end pt-2">
            <Button disabled={update.isPending} onClick={handleUpdate} className="bg-gradient-brand text-primary-foreground border-0 h-9 rounded-sm shadow-md">
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
