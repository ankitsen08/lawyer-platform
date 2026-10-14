"use client";

import { useContactStore } from "@/store/useContactStore";

interface ContactAttorneyClientProps {
  lawyerId: string;
  lawyerName: string;
}

export default function ContactAttorneyClient({ lawyerId, lawyerName }: ContactAttorneyClientProps) {
  const { openContactModal } = useContactStore();

  return (
    <div className="w-full md:w-auto flex flex-col gap-3">
      <button 
        onClick={() => openContactModal(lawyerId, lawyerName)}
        className="w-full md:w-64 bg-color-foreground text-color-background px-8 py-4 text-sm font-bold shadow-md hover:opacity-90 transition-minimal"
      >
        Contact Attorney Now
      </button>
      <button className="w-full md:w-64 border border-color-foreground bg-transparent text-color-foreground px-8 py-4 text-sm font-bold hover:bg-gray-50 transition-minimal">
        Visit Website
      </button>
    </div>
  );
}
