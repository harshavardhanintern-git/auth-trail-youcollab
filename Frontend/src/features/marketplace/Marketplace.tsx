import { Button } from "@/components/common/button";
import { CATEGORIES } from "@/constants";
import { gigsService, type Gig } from "@/services/gigs";
import { Input } from "@/components/common/input";
import { Link } from "react-router-dom";
import { Search, MapPin, IndianRupee, Calendar } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

const PUNE_LOCATIONS = [
  "All Areas",
  "Koregaon Park",
  "FC Road",
  "Kothrud",
  "Baner",
  "Viman Nagar",
  "Kalyani Nagar",
  "Camp",
  "Shivajinagar"
] as const;

export default function Marketplace() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeLocation, setActiveLocation] = useState<string>("All Areas");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: gigs = [], isLoading } = useQuery({ 
    queryKey: ["gigs"], 
    queryFn: gigsService.list 
  });

  const filteredGigs = useMemo(() => {
    return gigs.filter((g) => {
      const matchCategory = activeCategory ? g.category === activeCategory : true;
      
      const brandLoc = (g as any).brand?.location || "";
      const matchLocation = activeLocation === "All Areas" 
        ? true 
        : brandLoc.toLowerCase().includes(activeLocation.toLowerCase()) || g.city.toLowerCase().includes(activeLocation.toLowerCase());
      
      const matchSearch = searchQuery
        ? (g.title + g.description + ((g as any).brand?.businessName || "")).toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      
      return matchCategory && matchLocation && matchSearch && g.status === "OPEN";
    });
  }, [gigs, activeCategory, activeLocation, searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-[1200px] px-6 py-10 space-y-8">
        
        {/* Header Section matching Dashboard */}
        <div>
          <span className="inline-block border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground rounded-sm mb-3">Collab Marketplace</span>
          <h1 className="text-3xl font-semibold tracking-tight">Browse briefs in Pune</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Connect directly with Pune brands. Pitch in seconds.</p>
        </div>

        {/* Filter Toolbar matching Dashboard layout (no glass card wrappers) */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Browse gigs</h2>
              <p className="text-[12px] text-muted-foreground">Filter by category, location, or search keywords.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Location selection dropdown */}
              <div className="relative flex items-center gap-1.5 border border-border rounded-sm px-2.5 bg-background h-9">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select
                  value={activeLocation}
                  onChange={(e) => setActiveLocation(e.target.value)}
                  className="bg-transparent text-[12px] text-foreground focus:outline-none cursor-pointer pr-1"
                >
                  {PUNE_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc} className="bg-background text-foreground">
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search input field */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Search briefs or brands..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="h-9 text-[13px] pl-9 w-64 rounded-sm" 
                />
              </div>
            </div>
          </div>

          {/* Categories list matching Dashboard category buttons */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCategory(null)}
              className={`text-[11px] uppercase tracking-wider px-2.5 py-1 border rounded-sm transition-colors ${
                activeCategory === null ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              All Gigs
            </button>
            {CATEGORIES.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveCategory(id === activeCategory ? null : id)}
                className={`text-[11px] uppercase tracking-wider px-2.5 py-1 border rounded-sm inline-flex items-center gap-1 transition-colors ${
                  activeCategory === id ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Display briefs grid */}
        {isLoading ? (
          <div className="border border-border rounded-sm p-20 text-center text-[13px] text-muted-foreground">
            Loading marketplace briefs...
          </div>
        ) : filteredGigs.length === 0 ? (
          <div className="border border-border rounded-sm p-20 text-center text-[13px] text-muted-foreground">
            No active campaigns match your current filters. Try resetting search or location categories.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGigs.map((g) => (
              <div key={g.id} className="border border-border rounded-sm p-5 bg-background flex flex-col justify-between hover:border-zinc-500/50 transition-colors">
                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {g.city || "Pune"}</span>
                    <span className="text-foreground font-medium">{g.category}</span>
                  </div>
                  <h3 className="mt-3 text-[14px] font-semibold line-clamp-2">{g.title}</h3>
                  <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">{g.deliverables}</p>
                  
                  {g.brand?.businessName && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Brand: <span className="text-foreground font-medium">{g.brand.businessName}</span>
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between text-[12px]">
                    <span className="inline-flex items-center gap-0.5 font-medium">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {g.budgetMin?.toLocaleString()}–{g.budgetMax?.toLocaleString()}
                    </span>
                    {g.deadline && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
                        <Calendar className="h-3 w-3" /> {new Date(g.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button asChild className="w-full h-8 text-[12px] rounded-sm bg-gradient-brand text-primary-foreground border-0 shadow-sm hover:opacity-95">
                    <Link to={`/gigs/${g.id}`}>View brief & details</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
