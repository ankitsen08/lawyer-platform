"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import LawyerCard from "@/components/lawyer/LawyerCard";
import LawyerCardSkeleton from "@/components/lawyer/LawyerCardSkeleton";
import { Lawyer } from "@/store/useCompareStore";
import { AdvancedFilterSidebar } from "@/components/lawyers/AdvancedFilterSidebar";
import { X, Search, SlidersHorizontal } from "lucide-react";
import { getServerUrl } from "@/utils/apiUrl";

const MOCK_LAWYERS: Lawyer[] = [
  {
    id: "lwy-001",
    name: "Robert H. Pearson",
    firm: "Pearson & Hardman LLP",
    rating: 4.9,
    reviewCount: 342,
    description: "Specializing in corporate litigation and high-stakes mergers. With over 20 years of experience in the New York district, Mr. Pearson has a proven track record of securing favorable verdicts for Fortune 500 companies.",
    location: "New York, NY",
    imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&auto=format&fit=crop&q=60",
    specialty: "Corporate Litigation",
    experienceYears: 24,
    consultationAvailability: "Within 24 Hours"
  },
  {
    id: "lwy-002",
    name: "Eleanor Vance",
    firm: "Vance Family Law Group",
    rating: 4.7,
    reviewCount: 128,
    description: "A compassionate yet aggressive advocate in family law. Eleanor handles complex divorce, custody, and asset division cases with utmost discretion and professional rigor.",
    location: "Chicago, IL",
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=60",
    specialty: "Family Law",
    experienceYears: 15,
    consultationAvailability: "Same Day"
  },
  {
    id: "lwy-003",
    name: "Michael Sterling",
    firm: "Sterling Defense Associates",
    rating: 4.8,
    reviewCount: 215,
    description: "Former federal prosecutor turned top-tier criminal defense attorney. Michael brings unparalleled insight into the prosecution's strategies, ensuring the most robust defense possible.",
    location: "Los Angeles, CA",
    imageUrl: "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=500&auto=format&fit=crop&q=60",
    specialty: "Criminal Defense",
    experienceYears: 18,
    consultationAvailability: "Immediate (24/7)"
  },
  {
    id: "lwy-004",
    name: "Sarah Jenkins",
    firm: "Jenkins Intellectual Property",
    rating: 5.0,
    reviewCount: 89,
    description: "Pioneering patent and trademark attorney for tech startups and enterprise software firms. Sarah protects your most valuable intangible assets from infringement and dilution.",
    location: "San Francisco, CA",
    imageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&auto=format&fit=crop&q=60",
    specialty: "Intellectual Property",
    experienceYears: 12,
    consultationAvailability: "Within 48 Hours"
  },
  {
    id: "lwy-005",
    name: "David Chen",
    firm: "Chen Real Estate Partners",
    rating: 4.6,
    reviewCount: 174,
    description: "Expert counsel in commercial real estate transactions, zoning laws, and property disputes. David facilitates smooth, legally sound multi-million dollar property developments.",
    location: "Seattle, WA",
    imageUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=60",
    specialty: "Real Estate Law",
    experienceYears: 20,
    consultationAvailability: "Within 24 Hours"
  }
];

function LawyersDirectoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlCategory = searchParams.get("category") || "";
  const urlLocation = searchParams.get("location") || "";
  const urlSearch = searchParams.get("search") || "";

  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [freeConsultation, setFreeConsultation] = useState(false);
  const [experience, setExperience] = useState("Any");
  const [language, setLanguage] = useState("All");
  const [sortOption, setSortOption] = useState("rating_desc");
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);

  // Debounce search input for performance
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400); // 400ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  // Automatically update URL when debounced search changes
  useEffect(() => {
    // Only update if it differs from the current URL to prevent unnecessary pushes
    if (debouncedSearch !== urlSearch && (debouncedSearch.trim() !== "" || urlSearch !== "")) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      } else {
        params.delete("search");
      }
      router.push(`/lawyers?${params.toString()}`);
    }
  }, [debouncedSearch, searchParams, router, urlSearch]);

  // Fetch lawyers from backend with queries
  useEffect(() => {
    const fetchLawyers = async () => {
      setIsLoading(true);
      try {
        const SERVER_URL = getServerUrl();
        const params = new URLSearchParams();

        if (urlCategory) params.append("category", urlCategory);
        if (urlLocation) params.append("location", urlLocation);
        if (urlSearch) params.append("search", urlSearch);
        if (freeConsultation) params.append("freeConsultation", "true");

        let minYears = 0;
        if (experience === "5+ Years") minYears = 5;
        if (experience === "10+ Years") minYears = 10;
        if (experience === "20+ Years") minYears = 20;
        if (minYears > 0) params.append("minExperience", String(minYears));

        if (sortOption) params.append("sort", sortOption);

        const url = `${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/lawyers?${params.toString()}`;
        const res = await fetch(url);
        
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setLawyers(data);
            return;
          }
        }

        // Fallback filter locally if backend returns empty or unavailable
        let filtered = [...MOCK_LAWYERS];
        if (urlCategory) {
          filtered = filtered.filter(l => l.specialty.toLowerCase().includes(urlCategory.toLowerCase()));
        }
        if (urlLocation) {
          filtered = filtered.filter(l => l.location.toLowerCase().includes(urlLocation.toLowerCase()));
        }
        if (urlSearch) {
          filtered = filtered.filter(l => 
            l.name.toLowerCase().includes(urlSearch.toLowerCase()) || 
            l.firm.toLowerCase().includes(urlSearch.toLowerCase()) ||
            l.specialty.toLowerCase().includes(urlSearch.toLowerCase())
          );
        }
        if (minYears > 0) {
          filtered = filtered.filter(l => l.experienceYears >= minYears);
        }
        if (sortOption === "reviews") {
          filtered.sort((a, b) => b.reviewCount - a.reviewCount);
        } else if (sortOption === "name") {
          filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else {
          filtered.sort((a, b) => b.rating - a.rating);
        }

        setLawyers(filtered);
      } catch (error) {
        console.warn("Could not reach backend, using mock directory:", error);
        setLawyers(MOCK_LAWYERS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLawyers();
  }, [urlCategory, urlLocation, urlSearch, freeConsultation, experience, language, sortOption]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput.trim()) {
      params.set("search", searchInput.trim());
    } else {
      params.delete("search");
    }
    router.push(`/lawyers?${params.toString()}`);
  };

  const clearCategory = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    router.push(`/lawyers?${params.toString()}`);
  };

  const clearLocation = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("location");
    router.push(`/lawyers?${params.toString()}`);
  };

  const resetAllFilters = () => {
    setFreeConsultation(false);
    setExperience("Any");
    setLanguage("All");
    setSortOption("rating_desc");
    setSearchInput("");
    router.push("/lawyers");
  };

  const hasActiveFilters = Boolean(urlCategory || urlLocation || urlSearch || freeConsultation || experience !== "Any" || language !== "All");

  return (
    <div className="w-full bg-color-background px-6 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        
        {/* Page Header */}
        <div className="mb-10 border-b border-color-border-light pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-color-foreground sm:text-4xl">
            Featured Attorneys
          </h1>
          <p className="mt-4 text-lg text-color-text-muted">
            Browse our curated selection of verified legal professionals across the United States.
          </p>
        </div>

        {/* Search & Sort Bar */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 border border-color-border-light shadow-sm">
          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:w-auto relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search by name, firm, practice..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-24 py-2 border border-color-border-light text-sm focus:outline-none focus:border-black"
            />
            <button 
              type="submit" 
              className="absolute right-1 top-1 bottom-1 px-3 bg-black text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </form>

          {/* Sort Selector */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <span className="text-xs font-semibold text-color-text-muted whitespace-nowrap">Sort by:</span>
            <select 
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              disabled={isLoading}
              className="border border-color-border-light bg-transparent py-2 pl-3 pr-8 text-sm text-color-foreground focus:outline-none disabled:opacity-50"
            >
              <option value="rating_desc">Highest Rated</option>
              <option value="reviews">Most Reviewed</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Active Filter Pills */}
        {hasActiveFilters && (
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 mr-2">Active Filters:</span>
            {urlCategory && (
              <span className="inline-flex items-center gap-1.5 bg-neutral-100 border border-neutral-300 text-xs font-semibold px-3 py-1.5">
                Category: {urlCategory}
                <button onClick={clearCategory} className="hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
              </span>
            )}
            {urlLocation && (
              <span className="inline-flex items-center gap-1.5 bg-neutral-100 border border-neutral-300 text-xs font-semibold px-3 py-1.5">
                Location: {urlLocation}
                <button onClick={clearLocation} className="hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
              </span>
            )}
            {freeConsultation && (
              <span className="inline-flex items-center gap-1.5 bg-neutral-100 border border-neutral-300 text-xs font-semibold px-3 py-1.5">
                Free Consultation Only
                <button onClick={() => setFreeConsultation(false)} className="hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
              </span>
            )}
            {experience !== "Any" && (
              <span className="inline-flex items-center gap-1.5 bg-neutral-100 border border-neutral-300 text-xs font-semibold px-3 py-1.5">
                {experience}
                <button onClick={() => setExperience("Any")} className="hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
              </span>
            )}
            <button 
              onClick={resetAllFilters}
              className="text-xs font-bold underline text-neutral-500 hover:text-black ml-2"
            >
              Clear All
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Advanced Filter Sidebar */}
          <AdvancedFilterSidebar 
            freeConsultation={freeConsultation}
            onFreeConsultationChange={setFreeConsultation}
            experience={experience}
            onExperienceChange={setExperience}
            language={language}
            onLanguageChange={setLanguage}
            onReset={resetAllFilters}
          />

          {/* Lawyer Cards Grid */}
          <div className="flex-1 w-full">
            <div className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
              {isLoading ? "Searching directory..." : `Showing ${lawyers.length} verified attorneys`}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <LawyerCardSkeleton key={i} />
                ))}
              </div>
            ) : lawyers.length === 0 ? (
              <div className="border border-color-border-light bg-neutral-50 p-12 text-center">
                <h3 className="text-xl font-bold mb-2">No Attorneys Found</h3>
                <p className="text-sm text-neutral-500 mb-6">
                  No attorneys match your current filter criteria. Try expanding your search or resetting filters.
                </p>
                <button 
                  onClick={resetAllFilters}
                  className="bg-black text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:opacity-80 transition-opacity"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {lawyers.map((lawyer) => (
                  <LawyerCard key={lawyer.id} lawyer={lawyer} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LawyersDirectoryPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-sm font-bold">Loading directory...</div>}>
      <LawyersDirectoryContent />
    </Suspense>
  );
}
