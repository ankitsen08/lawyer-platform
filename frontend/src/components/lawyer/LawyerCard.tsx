"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, MapPin, CheckCircle2, Bookmark } from "lucide-react";
import { Lawyer, useCompareStore } from "@/store/useCompareStore";
import { toast } from "sonner";
import { TrustBadges } from "@/components/lawyers/TrustBadges";
import { useSavedAttorneysStore } from "@/store/useSavedAttorneysStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function LawyerCard({ lawyer }: { lawyer: Lawyer }) {
  const { selectedLawyers, addLawyer, removeLawyer } = useCompareStore();
  const { toggleSaveLawyer, isSaved } = useSavedAttorneysStore();
  const { clientSession } = useAuthStore();
  const [shake, setShake] = useState(false);
  const [isAdding, setIsAdding] = useState(false); // Used for a brief transition state
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const saved = hasMounted ? isSaved(lawyer.id) : false;

  const isSelected = hasMounted ? selectedLawyers.some((l) => l.id === lawyer.id) : false;
  const isMaxReached = hasMounted ? selectedLawyers.length >= 3 : false;

  const handleCompareClick = () => {
    if (isSelected) {
      removeLawyer(lawyer.id);
      toast.info(`Removed ${lawyer.name} from comparison.`);
    } else if (isMaxReached) {
      // Trigger error shake & toast
      setShake(true);
      toast.error("Comparison tray full", {
        description: "You can only compare up to 3 lawyers at a time. Please clear a slot first.",
      });
      setTimeout(() => setShake(false), 300); // Remove class after animation
    } else {
      // Smooth visual transition for adding
      setIsAdding(true);
      addLawyer(lawyer);
      toast.success("Added to comparison tray", {
        description: `${lawyer.name} is now ready to compare.`,
      });
      setTimeout(() => setIsAdding(false), 200);
    }
  };

  const handleSaveClick = () => {
    toggleSaveLawyer(lawyer, clientSession.user?._id);
    if (saved) {
      toast.info(`Removed ${lawyer.name} from saved attorneys.`);
    } else {
      toast.success(`Saved ${lawyer.name} to your dashboard.`);
    }
  };

  return (
    <div className="flex flex-col border border-color-border-light bg-color-background transition-minimal hover:border-color-foreground hover:shadow-sm relative">
      {/* Photo Placeholder Area */}
      <div className="aspect-[4/3] w-full bg-[#f5f5f5] flex items-center justify-center border-b border-color-border-light overflow-hidden relative">
        <button 
          onClick={handleSaveClick}
          className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-md hover:bg-neutral-50 transition-colors"
          aria-label={saved ? "Remove from saved" : "Save attorney"}
        >
          <Bookmark className={`w-5 h-5 transition-colors ${saved ? 'fill-black text-black' : 'text-color-text-muted hover:text-black'}`} />
        </button>
        {lawyer.imageUrl ? (
          <div className="relative w-full h-full">
            <Image 
              src={lawyer.imageUrl} 
              alt={lawyer.name} 
              fill
              className="object-cover grayscale opacity-90 transition-minimal hover:grayscale-0"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className="text-color-text-muted text-sm tracking-widest uppercase">
            Photo Unavailable
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-xl font-bold text-color-foreground">{lawyer.name}</h3>
            <p className="text-sm font-medium text-color-text-muted">{lawyer.firm}</p>
          </div>
        </div>

        {/* Rating and Trust Badges */}
        <div className="mb-4">
          <TrustBadges rating={lawyer.rating} reviewCount={lawyer.reviewCount} />
          <div className="mt-2 text-xs font-medium text-color-text-muted">
            Based on {lawyer.reviewCount} verified client reviews
          </div>
        </div>

        {/* Specialty & Location */}
        <div className="flex flex-col gap-2 mb-4 text-sm text-color-text-muted">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{lawyer.location}</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span className="bg-color-border-light/50 px-2 py-0.5">{lawyer.specialty}</span>
            <span>·</span>
            <span>{lawyer.experienceYears} Years Exp.</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-color-foreground mb-6 line-clamp-3">
          {lawyer.description}
        </p>

        {/* Actions */}
        <div className="mt-auto pt-4 border-t border-color-border-light flex flex-col gap-2 xl:flex-row">
          <Link 
            href={`/lawyers/${lawyer.id}`}
            className="flex-1 flex items-center justify-center bg-color-foreground text-color-background px-4 py-2 text-sm font-semibold hover:opacity-80 transition-minimal whitespace-nowrap"
          >
            View Profile
          </Link>
          <button 
            onClick={handleCompareClick}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all duration-300 whitespace-nowrap ${shake ? 'animate-shake' : ''} ${
              isSelected || isAdding
                ? 'bg-color-background border-2 border-color-foreground text-color-foreground shadow-[inset_0_0_0_1px_#000]'
                : isMaxReached
                  ? 'border border-color-border-light text-color-text-muted bg-gray-50'
                  : 'border border-color-border-light bg-transparent text-color-foreground hover:border-color-foreground'
            }`}
          >
            {isSelected || isAdding ? (
              <>
                <CheckCircle2 className="h-4 w-4 animate-in zoom-in" />
                Added
              </>
            ) : (
              "Add to Compare"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
