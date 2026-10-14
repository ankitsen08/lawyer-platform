"use client";

import { Search, MapPin } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HeroSearch() {
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct query parameters
    const params = new URLSearchParams();
    if (category.trim()) params.append("category", category.trim());
    if (location.trim()) params.append("location", location.trim());
    
    const queryString = params.toString();
    
    // Navigate to lawyers page with or without search query
    router.push(`/lawyers${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <section className="relative w-full border-b border-color-border-light bg-color-background px-6 py-24 lg:px-8 lg:py-32 flex flex-col items-center justify-center text-center">
      <div className="mx-auto max-w-3xl space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-color-foreground sm:text-6xl">
          Find the Right Legal Representation.
        </h1>
        <p className="text-lg leading-8 text-color-text-muted">
          Connect with elite attorneys across the United States. Search by practice area and location to find the perfect advocate for your case.
        </p>

        <div className="mx-auto mt-10 max-w-2xl bg-color-background shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-color-border-light">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row">
            
            {/* Category Input */}
            <div className="relative flex-1 border-b sm:border-b-0 sm:border-r border-color-border-light">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Search className="h-5 w-5 text-color-text-muted" aria-hidden="true" />
              </div>
              <input
                type="text"
                className="block w-full h-14 bg-transparent py-1.5 pl-12 pr-4 text-color-foreground placeholder:text-color-text-muted focus:outline-none sm:text-sm sm:leading-6"
                placeholder="Legal Category (e.g., DUI, Family Law)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            {/* Location Input */}
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <MapPin className="h-5 w-5 text-color-text-muted" aria-hidden="true" />
              </div>
              <input
                type="text"
                className="block w-full h-14 bg-transparent py-1.5 pl-12 pr-4 text-color-foreground placeholder:text-color-text-muted focus:outline-none sm:text-sm sm:leading-6"
                placeholder="Location (e.g., New York, NY)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="flex h-14 items-center justify-center bg-color-foreground px-8 text-sm font-semibold text-color-background hover:opacity-80 transition-minimal sm:w-auto w-full"
            >
              Search
            </button>

          </form>
        </div>
      </div>
    </section>
  );
}
