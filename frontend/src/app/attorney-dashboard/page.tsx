"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, UserCircle, CreditCard, BarChart3, Settings, ShieldCheck, Crown, ExternalLink, MessageSquare, FileQuestion } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import LawyerMessagesTab from "@/components/chat/LawyerMessagesTab";
import LawyerOverviewTab from "@/components/dashboard/LawyerOverviewTab";
import LawyerEditProfileTab from "@/components/dashboard/LawyerEditProfileTab";
import LawyerBillingTab from "@/components/dashboard/LawyerBillingTab";
import LawyerSettingsTab from "@/components/dashboard/LawyerSettingsTab";
import LawyerQATab from "@/components/dashboard/LawyerQATab";

export default function AttorneyDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { lawyerSession } = useAuthStore();
  const { user } = lawyerSession;

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-50 flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-black text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
              <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=60" alt="Robert Pearson" className="grayscale" />
            </div>
            <div>
              <p className="font-bold text-sm">{user?.name || user?.firmName || "Verified Attorney"}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[10px] uppercase tracking-widest text-neutral-400">Verified</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: "overview", icon: LayoutDashboard, label: "Overview" },
            { id: "qa", icon: FileQuestion, label: "Q&A Manager" },
            { id: "messages", icon: MessageSquare, label: "Client Inbox" },
            { id: "profile", icon: UserCircle, label: "Edit Profile" },
            { id: "analytics", icon: BarChart3, label: "Analytics" },
            { id: "billing", icon: CreditCard, label: "Billing & Plan" },
            { id: "settings", icon: Settings, label: "Settings" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === item.id 
                  ? "bg-white text-black" 
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <Link href={`/lawyers/${user?._id || user?.email || "lwy-001"}`} className="flex items-center justify-center gap-2 w-full border border-neutral-700 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-900 transition-colors">
            View Public Profile <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto w-full">
        
        {activeTab === "overview" && (
          <LawyerOverviewTab lawyerId={user?._id || user?.email || "lwy-001"} setActiveTab={setActiveTab} />
        )}

        {activeTab === "qa" && (
          <LawyerQATab />
        )}

        {activeTab === "profile" && (
          <LawyerEditProfileTab lawyerId={user?._id || user?.email || "lwy-001"} />
        )}

        {activeTab === "billing" && (
          <LawyerBillingTab />
        )}

        {activeTab === "analytics" && (
          <LawyerOverviewTab lawyerId={user?._id || user?.email || "lwy-001"} setActiveTab={setActiveTab} />
        )}

        {activeTab === "messages" && (
          <div className="h-full w-full">
            <LawyerMessagesTab lawyerId={user?._id || user?.email || "lwy-001"} />
          </div>
        )}

        {activeTab === "settings" && (
          <LawyerSettingsTab />
        )}
      </main>
    </div>
  );
}
