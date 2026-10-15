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
    <section className="relative w-full border-b border-neutral-200 border-color-border-light bg-white bg-color-background px-6 py-20 lg:px-8 lg:py-28 flex flex-col items-center justify-center text-center">
      <div className="mx-auto max-w-3xl space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 text-color-foreground sm:text-6xl font-sans">
          Find the Right Legal Representation.
        </h1>
        <p className="text-lg leading-8 text-neutral-600 text-color-text-muted max-w-2xl mx-auto">
          Connect with elite attorneys across the United States. Search by practice area and location to find the perfect advocate for your case.
        </p>

        <div className="mx-auto mt-8 max-w-2xl bg-white bg-color-background shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-neutral-200 border-color-border-light rounded-sm overflow-hidden">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row">
            
            {/* Category Input */}
            <div className="relative flex-1 border-b sm:border-b-0 sm:border-r border-neutral-200 border-color-border-light">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Search className="h-5 w-5 text-neutral-400 text-color-text-muted" aria-hidden="true" />
              </div>
              <input
                type="text"
                className="block w-full h-14 bg-white py-1.5 pl-12 pr-4 text-neutral-900 text-color-foreground placeholder:text-neutral-400 focus:outline-none sm:text-sm sm:leading-6"
                placeholder="Legal Category (e.g., DUI, Family Law)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            {/* Location Input */}
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <MapPin className="h-5 w-5 text-neutral-400 text-color-text-muted" aria-hidden="true" />
              </div>
              <input
                type="text"
                className="block w-full h-14 bg-white py-1.5 pl-12 pr-4 text-neutral-900 text-color-foreground placeholder:text-neutral-400 focus:outline-none sm:text-sm sm:leading-6"
                placeholder="Location (e.g., New York, NY)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="flex h-14 items-center justify-center bg-black bg-color-foreground px-8 text-sm font-semibold text-white text-color-background hover:bg-neutral-800 transition-minimal sm:w-auto w-full cursor-pointer"
            >
              Search
            </button>

          </form>
        </div>
      </div>
    </section>
  );
}
