"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Bookmark, MessageSquare, Calendar, ChevronRight, Star, MapPin } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useContactStore } from "@/store/useContactStore";
import { useSavedAttorneysStore } from "@/store/useSavedAttorneysStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import MessagesTab from "@/components/chat/MessagesTab";
import ConsultationsTab from "@/components/dashboard/ConsultationsTab";
import AccountSettingsTab from "@/components/dashboard/AccountSettingsTab";

export default function ClientDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("saved");
  
  const { clientSession } = useAuthStore();
  const { user, isAuthenticated } = clientSession;
  const { openContactModal } = useContactStore();
  const { savedLawyers, removeLawyer, fetchSavedLawyers } = useSavedAttorneysStore();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && (!isAuthenticated || user?.role !== 'client')) {
      router.push('/client-login');
    } else if (isMounted && isAuthenticated && user?._id) {
      // Hydrate saved attorneys from the backend
      fetchSavedLawyers(user._id);
    }
  }, [isMounted, isAuthenticated, user, router, fetchSavedLawyers]);

  const handleRemove = (id: string, name: string) => {
    removeLawyer(id, user?._id);
    toast.success(`${name} removed from saved list.`);
  };

  if (!isMounted) return <div className="h-screen bg-color-background"></div>; // Wait for hydration
  if (!isAuthenticated || !user) return null; // Avoid flicker during redirect

  return (
    <div className="h-[calc(100vh-64px)] bg-color-background flex flex-col md:flex-row border-t border-color-border-light overflow-hidden">
      
      {/* Client Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-color-border-light flex flex-col shrink-0">
        <div className="p-8 border-b border-color-border-light bg-neutral-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-bold text-lg uppercase">
              {(user.name || user.firstName || "U").charAt(0)}
            </div>
            <div>
              <p className="font-bold text-sm text-color-foreground">
                {user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Client"}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-color-text-muted mt-1">Client Account</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: "saved", icon: Bookmark, label: "Saved Attorneys" },
            { id: "messages", icon: MessageSquare, label: "Messages & Inquiries" },
            { id: "consultations", icon: Calendar, label: "Consultations" },
            { id: "profile", icon: User, label: "Account Settings" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-all ${
                activeTab === item.id 
                  ? "bg-black text-white" 
                  : "text-color-text-muted hover:bg-neutral-100 hover:text-black"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
              {activeTab === item.id && <ChevronRight className="w-4 h-4" />}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        
        {activeTab === "saved" && (
          <div className="p-6 md:p-12 lg:p-16 max-w-5xl mx-auto w-full">
            <div className="mb-10 border-b border-color-border-light pb-6">
              <h1 className="text-3xl font-bold tracking-tight text-color-foreground">Saved Attorneys</h1>
              <p className="mt-2 text-color-text-muted">Review the legal professionals you are considering hiring.</p>
            </div>

            <div className="space-y-6">
              {savedLawyers.length === 0 ? (
                <div className="text-center py-12 border border-color-border-light bg-neutral-50">
                  <p className="text-color-text-muted">You have no saved attorneys yet.</p>
                  <Link href="/find" className="mt-4 inline-block font-bold text-black border-b border-black">Browse Directory</Link>
                </div>
              ) : (
                savedLawyers.map((lawyer) => (
                  <div key={lawyer.id} className="border border-color-border-light bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6 group hover:border-black transition-colors">
                    <div className="w-24 h-24 shrink-0 bg-neutral-100 overflow-hidden">
                      <img src={lawyer.imageUrl} alt={lawyer.name} className="w-full h-full object-cover grayscale" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-color-foreground group-hover:underline decoration-2 underline-offset-4">
                            <Link href={`/lawyers/${lawyer.id}`}>{lawyer.name}</Link>
                          </h3>
                          <p className="text-sm font-medium text-color-text-muted mt-1">{lawyer.firm}</p>
                        </div>
                        <button 
                          onClick={() => handleRemove(lawyer.id, lawyer.name)}
                          className="text-xs font-bold uppercase tracking-widest text-color-text-muted hover:text-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-sm font-medium">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-black text-black" />
                          <span>{lawyer.rating}</span>
                        </div>
                        <div className="flex items-center gap-1 text-color-text-muted">
                          <MapPin className="w-4 h-4" />
                          <span>{lawyer.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-auto flex flex-col gap-2 shrink-0">
                      <Link 
                        href={`/lawyers/${lawyer.id}`} 
                        className="w-full text-center border-2 border-black bg-black text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                      >
                        View Profile
                      </Link>
                      
                      {lawyer.hasConsultation ? (
                        <div className="w-full text-center bg-green-50 text-green-700 px-6 py-2 text-[10px] font-bold uppercase tracking-widest border border-green-200">
                          Consultation Booked
                        </div>
                      ) : (
                        <button 
                          onClick={() => openContactModal(lawyer.id, lawyer.name)}
                          className="w-full text-center border border-color-border-light bg-white text-black px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neutral-50 transition-colors"
                        >
                          Message
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "messages" && (
          <div className="h-full w-full">
            <MessagesTab userId={user?._id || user?.email || "user-123"} />
          </div>
        )}
        
        {activeTab === "consultations" && (
          <ConsultationsTab userId={user?._id || user?.email || "user-123"} setActiveTab={setActiveTab} />
        )}

        {activeTab === "profile" && (
          <AccountSettingsTab />
        )}

      </main>
    </div>
  );
}
