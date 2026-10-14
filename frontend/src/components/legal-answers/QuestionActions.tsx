"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function QuestionActions({ initialUpvotes, lawyerId }: { initialUpvotes: number, lawyerId?: string }) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const router = useRouter();
  const { clientSession } = useAuthStore();

  const handleUpvote = () => {
    if (!clientSession.isAuthenticated) {
      toast.error("Please login to upvote this answer.");
      router.push("/client-login");
      return;
    }
    
    if (hasUpvoted) {
      setUpvotes(prev => prev - 1);
      setHasUpvoted(false);
    } else {
      setUpvotes(prev => prev + 1);
      setHasUpvoted(true);
      toast.success("Thank you for your feedback!");
    }
  };

  const handleContact = () => {
    toast.success("Direct messaging is opening...");
    router.push("/client-dashboard");
  };

  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-neutral-100 pt-4 mt-6">
      <button 
        onClick={handleUpvote}
        className={`flex items-center gap-2 px-4 py-2 transition-colors text-xs font-bold uppercase tracking-widest ${
          hasUpvoted 
            ? "bg-black text-white" 
            : "bg-neutral-100 hover:bg-neutral-200 text-black"
        }`}
      >
        <ThumbsUp className="w-4 h-4" /> Helpful ({upvotes})
      </button>
      <button 
        onClick={handleContact}
        className="px-4 py-2 border border-neutral-300 hover:border-black transition-colors text-xs font-bold uppercase tracking-widest text-black"
      >
        Contact Attorney
      </button>
    </div>
  );
}
