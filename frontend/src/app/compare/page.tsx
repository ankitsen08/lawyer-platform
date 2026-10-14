"use client";

import Link from "next/link";
import { Star, ArrowLeft, Trash2 } from "lucide-react";
import { useCompareStore } from "@/store/useCompareStore";
import { useContactStore } from "@/store/useContactStore";

export default function ComparePage() {
  const { selectedLawyers, removeLawyer, clearCompare } = useCompareStore();

  if (selectedLawyers.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center h-[60vh]">
        <h1 className="text-3xl font-bold tracking-tight text-color-foreground sm:text-4xl">
          No Lawyers Selected
        </h1>
        <p className="mt-4 text-lg text-color-text-muted">
          You haven't selected any lawyers to compare yet.
        </p>
        <Link 
          href="/lawyers" 
          className="mt-8 bg-color-foreground text-color-background px-8 py-3 text-sm font-semibold hover:opacity-80 transition-minimal"
        >
          Browse Lawyers
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-color-background px-6 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-color-border-light pb-6">
          <div>
            <Link 
              href="/lawyers" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-color-text-muted hover:text-color-foreground mb-4 transition-minimal"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Directory
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-color-foreground sm:text-4xl">
              Compare Attorneys
            </h1>
          </div>
          <button 
            onClick={clearCompare}
            className="text-sm font-semibold text-red-600 hover:text-red-800 transition-minimal"
          >
            Clear All
          </button>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto md:overflow-hidden border border-color-border-light shadow-sm">
          <table className="w-full min-w-[700px] md:min-w-full table-fixed text-left text-sm text-color-foreground">
            <thead className="bg-gray-50 border-b border-color-border-light uppercase tracking-wider text-xs font-bold text-color-text-muted">
              <tr>
                <th scope="col" className="px-4 sm:px-6 py-4 border-r border-color-border-light w-1/4 sm:w-48">
                  Features
                </th>
                {selectedLawyers.map((lawyer) => (
                  <th key={lawyer.id} scope="col" className="px-4 sm:px-6 py-4 border-r border-color-border-light relative">
                    <button 
                      onClick={() => removeLawyer(lawyer.id)}
                      className="absolute top-4 right-4 text-color-text-muted hover:text-red-600 transition-minimal"
                      aria-label="Remove from compare"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="mt-6 mb-2">
                      <h3 className="text-lg font-bold text-color-foreground">{lawyer.name}</h3>
                      <p className="text-color-text-muted font-normal text-xs">{lawyer.firm}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-color-border-light bg-color-background">
              
              {/* Rating */}
              <tr className="hover:bg-gray-50/50 transition-minimal">
                <th scope="row" className="px-6 py-4 font-semibold text-color-text-muted border-r border-color-border-light">
                  Client Rating
                </th>
                {selectedLawyers.map((lawyer) => (
                  <td key={lawyer.id} className="px-6 py-4 border-r border-color-border-light">
                    <div className="flex items-center gap-1 font-bold">
                      <Star className="h-4 w-4 fill-color-foreground text-color-foreground" />
                      {lawyer.rating.toFixed(1)} <span className="font-normal text-color-text-muted text-xs">({lawyer.reviewCount})</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Specialty */}
              <tr className="hover:bg-gray-50/50 transition-minimal">
                <th scope="row" className="px-6 py-4 font-semibold text-color-text-muted border-r border-color-border-light">
                  Specialty
                </th>
                {selectedLawyers.map((lawyer) => (
                  <td key={lawyer.id} className="px-6 py-4 border-r border-color-border-light font-medium">
                    {lawyer.specialty}
                  </td>
                ))}
              </tr>

              {/* Experience Years */}
              <tr className="hover:bg-gray-50/50 transition-minimal">
                <th scope="row" className="px-6 py-4 font-semibold text-color-text-muted border-r border-color-border-light">
                  Experience
                </th>
                {selectedLawyers.map((lawyer) => (
                  <td key={lawyer.id} className="px-6 py-4 border-r border-color-border-light">
                    {lawyer.experienceYears} Years
                  </td>
                ))}
              </tr>

              {/* Location */}
              <tr className="hover:bg-gray-50/50 transition-minimal">
                <th scope="row" className="px-6 py-4 font-semibold text-color-text-muted border-r border-color-border-light">
                  Location
                </th>
                {selectedLawyers.map((lawyer) => (
                  <td key={lawyer.id} className="px-6 py-4 border-r border-color-border-light">
                    {lawyer.location}
                  </td>
                ))}
              </tr>

              {/* Consultation Availability */}
              <tr className="hover:bg-gray-50/50 transition-minimal">
                <th scope="row" className="px-6 py-4 font-semibold text-color-text-muted border-r border-color-border-light">
                  Availability
                </th>
                {selectedLawyers.map((lawyer) => (
                  <td key={lawyer.id} className="px-6 py-4 border-r border-color-border-light">
                    {lawyer.consultationAvailability}
                  </td>
                ))}
              </tr>

              {/* Action Rows */}
              <tr>
                <th scope="row" className="px-6 py-6 border-r border-color-border-light bg-gray-50"></th>
                {selectedLawyers.map((lawyer) => (
                  <td key={lawyer.id} className="px-6 py-6 border-r border-color-border-light bg-gray-50">
                    <button 
                      onClick={() => useContactStore.getState().openContactModal(lawyer.id, lawyer.name)}
                      className="block w-full text-center bg-color-foreground text-color-background px-4 py-3 text-sm font-semibold hover:opacity-80 transition-minimal"
                    >
                      Contact Attorney
                    </button>
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
