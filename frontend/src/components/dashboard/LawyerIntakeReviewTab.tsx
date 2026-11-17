"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Download,
  ExternalLink,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ClipboardCheck,
  BellRing,
  Briefcase,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { getServerUrl } from "@/utils/apiUrl";
import {
  AttachmentItem,
  formatBytes,
  getBudgetLabel,
  getContactMethodLabel,
  getUrgencyMeta
} from "@/utils/legalData";

export interface IntakeDossier {
  id: string;
  recordType: "inquiry" | "consultation";
  source: "direct_inquiry" | "onboarding_wizard" | "consultation";
  lawyerId: string;
  lawyerName: string;
  clientId: string;
  fullName: string;
  email: string;
  phone: string;
  smsConsent: boolean;
  city: string;
  state: string;
  zipCode: string;
  location: string;
  preferredContactMethod: string;
  issue: string;
  subCategory: string;
  urgency: "immediate" | "this_week" | "exploratory";
  incidentDate: string;
  opposingParty: string;
  budgetRange: string;
  description: string;
  attachments: AttachmentItem[];
  conflictStatus: "pending" | "cleared" | "conflict_found";
  status: "new" | "reviewed" | "conflict_cleared" | "contacted" | "closed";
  consultationDate?: string;
  consultationTime?: string;
  meetingFormat?: string;
  createdAt: string;
}

interface IntakeSummary {
  total: number;
  immediateCount: number;
  conflictPendingCount: number;
  attachmentCount: number;
}

export default function LawyerIntakeReviewTab({
  lawyerId,
  setActiveTab
}: {
  lawyerId: string;
  setActiveTab: (tab: string) => void;
}) {
  const { lawyerSession } = useAuthStore();
  const { setActiveContactId } = useChatStore();

  const [inquiries, setInquiries] = useState<IntakeDossier[]>([]);
  const [summary, setSummary] = useState<IntakeSummary>({
    total: 0,
    immediateCount: 0,
    conflictPendingCount: 0,
    attachmentCount: 0
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentItem | null>(null);

  const fetchInquiries = async () => {
    try {
      setIsLoading(true);
      setAuthError(false);
      const SERVER_URL = getServerUrl();
      const baseUrl = SERVER_URL.replace("ws://", "http://").replace("wss://", "https://");

      const headers: Record<string, string> = {};
      if (lawyerSession.token) {
        headers.Authorization = `Bearer ${lawyerSession.token}`;
      }

      const res = await fetch(`${baseUrl}/api/lawyers/${encodeURIComponent(lawyerId)}/inquiries`, {
        credentials: "include",
        headers
      });

      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch intake dossiers");
      }

      const data = await res.json();
      const list: IntakeDossier[] = data.inquiries || [];
      setInquiries(list);
      if (data.summary) setSummary(data.summary);

      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load client intake reviews.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!lawyerSession.isAuthenticated || lawyerSession.user?.role !== "lawyer") {
      setAuthError(true);
      setIsLoading(false);
      return;
    }
    fetchInquiries();
  }, [lawyerId, lawyerSession.isAuthenticated, lawyerSession.user?.role]);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((item) => {
      if (urgencyFilter === "pending_conflict") {
        if (!item.opposingParty || item.conflictStatus !== "pending") return false;
      } else if (urgencyFilter !== "all") {
        if (item.urgency !== urgencyFilter) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const hay = `${item.fullName} ${item.email} ${item.issue} ${item.subCategory} ${item.opposingParty} ${item.location} ${item.city} ${item.zipCode}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }, [inquiries, urgencyFilter, searchTerm]);

  const selected = useMemo(() => {
    return filteredInquiries.find((i) => i.id === selectedId) || filteredInquiries[0] || null;
  }, [filteredInquiries, selectedId]);

  const handleUpdateStatus = async (
    item: IntakeDossier,
    nextStatus: IntakeDossier["status"],
    nextConflictStatus?: IntakeDossier["conflictStatus"]
  ) => {
    if (item.recordType !== "inquiry") {
      toast.info("Conflict clearance noted for scheduled consultation.");
      setInquiries((prev) =>
        prev.map((d) =>
          d.id === item.id
            ? { ...d, status: nextStatus, conflictStatus: nextConflictStatus || d.conflictStatus }
            : d
        )
      );
      return;
    }

    setUpdatingId(item.id);
    try {
      const SERVER_URL = getServerUrl();
      const baseUrl = SERVER_URL.replace("ws://", "http://").replace("wss://", "https://");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (lawyerSession.token) headers.Authorization = `Bearer ${lawyerSession.token}`;

      const res = await fetch(`${baseUrl}/api/inquiries/${encodeURIComponent(item.id)}/status`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({
          status: nextStatus,
          ...(nextConflictStatus ? { conflictStatus: nextConflictStatus } : {})
        })
      });

      if (!res.ok) throw new Error("Failed to update status");

      setInquiries((prev) =>
        prev.map((d) =>
          d.id === item.id
            ? {
                ...d,
                status: nextStatus,
                conflictStatus: nextConflictStatus || (nextStatus === "conflict_cleared" ? "cleared" : d.conflictStatus)
              }
            : d
        )
      );
      toast.success("Intake status updated", {
        description: `${item.fullName} marked as ${nextConflictStatus ? nextConflictStatus.replace("_", " ") : nextStatus.replace("_", " ")}.`
      });
    } catch (err) {
      toast.error("Failed to update review status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenChat = (clientEmailOrId: string) => {
    setActiveContactId(clientEmailOrId);
    setActiveTab("messages");
  };

  if (authError) {
    return (
      <div className="p-8 md:p-16 max-w-2xl mx-auto text-center">
        <div className="bg-white border border-neutral-200 p-10 shadow-sm rounded-sm">
          <div className="w-12 h-12 bg-black text-white flex items-center justify-center mx-auto mb-4 rounded-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-black mb-2">Attorney Authentication Required</h2>
          <p className="text-sm text-neutral-600 mb-6">
            Client intake dossiers contain confidential case details, opposing party names for conflict checks, and uploaded legal documents. Sign in to your verified attorney account to inspect dossiers.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
          >
            Sign In to Attorney Portal
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center min-h-[420px]">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mb-3" />
        <p className="text-sm font-medium text-neutral-500">Loading client intake dossiers &amp; conflict screening queue...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-6">
      
      {/* Top KPI Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-black text-white rounded-sm">
              <ClipboardCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
              Client Intake &amp; Conflict Review
            </h1>
          </div>
          <p className="text-sm text-neutral-500 mt-1.5">
            Inspect client contact preferences, jurisdictional location, opposing-party conflict checks, budgets, and attached case documents.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white border border-neutral-200 px-4 py-2.5 rounded-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Intakes</p>
            <p className="text-xl font-black text-black">{summary.total}</p>
          </div>
          <div className="bg-red-50 border border-red-200 px-4 py-2.5 rounded-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">Immediate</p>
            <p className="text-xl font-black text-red-900">{summary.immediateCount}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Conflict Checks</p>
            <p className="text-xl font-black text-amber-950">{summary.conflictPendingCount}</p>
          </div>
          <div className="bg-white border border-neutral-200 px-4 py-2.5 rounded-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Documents</p>
            <p className="text-xl font-black text-black">{summary.attachmentCount}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white border border-neutral-200 p-3 rounded-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search client, opposing party, category, city, or zip code..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-black focus:outline-none rounded-sm"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: "All" },
            { id: "immediate", label: "Immediate / Court Date" },
            { id: "this_week", label: "This Week" },
            { id: "exploratory", label: "Exploratory" },
            { id: "pending_conflict", label: "Conflict Pending" }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setUrgencyFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition-colors ${
                urgencyFilter === f.id
                  ? "bg-black text-white border-black"
                  : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-black"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Master-Detail Dossier Inspector */}
      {filteredInquiries.length === 0 ? (
        <div className="bg-white border border-neutral-200 p-12 text-center rounded-sm">
          <Briefcase className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-black">No Client Intake Dossiers Found</h3>
          <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
            New client registrations, case inquiries, and consultation requests matching your filters will appear here for conflict screening and review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT QUEUE */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
            {filteredInquiries.map((item) => {
              const urg = getUrgencyMeta(item.urgency);
              const isSelected = selected?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left p-4 border rounded-sm transition-all ${
                    isSelected
                      ? "bg-white border-black ring-1 ring-black shadow-md"
                      : "bg-white border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                          item.urgency === "immediate"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : item.urgency === "this_week"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                        }`}
                      >
                        {urg.label}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-sm">
                        {item.source === "onboarding_wizard"
                          ? "Onboarding Match"
                          : item.source === "consultation"
                          ? "Consultation"
                          : "Direct Inquiry"}
                      </span>
                    </div>

                    <span className="text-[10px] text-neutral-400 shrink-0">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-black truncate">{item.fullName}</h4>
                  <p className="text-xs font-semibold text-neutral-700 mt-0.5 truncate">
                    {item.issue}
                    {item.subCategory ? ` · ${item.subCategory}` : ""}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.location || "Jurisdiction Pending"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {getBudgetLabel(item.budgetRange)}
                    </span>
                    {item.attachments?.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-black font-semibold">
                        <FileText className="w-3 h-3" />
                        {item.attachments.length} File{item.attachments.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {item.opposingParty && (
                    <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                      <span className="text-neutral-600 truncate">
                        <strong>Opposing:</strong> {item.opposingParty}
                      </span>
                      <span
                        className={`font-bold uppercase text-[10px] shrink-0 ml-2 ${
                          item.conflictStatus === "cleared"
                            ? "text-green-700"
                            : item.conflictStatus === "conflict_found"
                            ? "text-red-700"
                            : "text-amber-700"
                        }`}
                      >
                        {item.conflictStatus === "cleared"
                          ? "Cleared"
                          : item.conflictStatus === "conflict_found"
                          ? "Conflict!"
                          : "Screen Conflict"}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* RIGHT DETAIL INSPECTOR */}
          {selected && (
            <div className="lg:col-span-7 bg-white border border-neutral-200 shadow-sm rounded-sm overflow-hidden">
              
              {/* Top Dossier Banner & Conflict Clearance Actions */}
              <div className="p-6 border-b border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm">
                      Status: {selected.status.replace("_", " ")}
                    </span>
                    {selected.source === "consultation" && selected.consultationDate && (
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
                        Booked: {selected.consultationDate} at {selected.consultationTime} ({selected.meetingFormat?.toUpperCase()})
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-black">{selected.fullName}</h2>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Matter: <strong className="text-black">{selected.issue}</strong>
                    {selected.subCategory ? ` — ${selected.subCategory}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={updatingId === selected.id}
                    onClick={() => handleUpdateStatus(selected, "conflict_cleared", "cleared")}
                    className="inline-flex items-center gap-1.5 bg-green-700 text-white px-3 py-2 text-[11px] font-bold uppercase tracking-wider hover:bg-green-800 transition-colors rounded-sm disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Clear Conflict
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === selected.id}
                    onClick={() => handleUpdateStatus(selected, "reviewed", "conflict_found")}
                    className="inline-flex items-center gap-1.5 bg-white border border-red-300 text-red-700 px-3 py-2 text-[11px] font-bold uppercase tracking-wider hover:bg-red-50 transition-colors rounded-sm disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Flag Conflict
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenChat(selected.email || selected.clientId)}
                    className="inline-flex items-center gap-1.5 bg-black text-white px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors rounded-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message Client
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                
                {/* Conflict-of-Interest Screening Box */}
                <div
                  className={`p-4 border rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    selected.conflictStatus === "cleared"
                      ? "bg-green-50 border-green-200"
                      : selected.conflictStatus === "conflict_found"
                      ? "bg-red-50 border-red-200"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {selected.conflictStatus === "cleared" ? (
                      <ShieldCheck className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${selected.conflictStatus === "conflict_found" ? "text-red-700" : "text-amber-700"}`} />
                    )}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                        Conflict-of-Interest Check — Opposing Party / Entity
                      </p>
                      <p className="text-sm font-bold text-black mt-0.5">
                        {selected.opposingParty || "Not Specified by Client"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm self-start sm:self-auto ${
                      selected.conflictStatus === "cleared"
                        ? "bg-green-700 text-white"
                        : selected.conflictStatus === "conflict_found"
                        ? "bg-red-700 text-white"
                        : "bg-amber-700 text-white"
                    }`}
                  >
                    {selected.conflictStatus.replace("_", " ")}
                  </span>
                </div>

                {/* Contact & Jurisdictional Location Grid */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
                    Contact &amp; Jurisdictional Location
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-50 p-4 border border-neutral-200 rounded-sm">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Email Address</p>
                      <a
                        href={`mailto:${selected.email}`}
                        className="text-sm font-semibold text-black hover:underline inline-flex items-center gap-1.5 break-all"
                      >
                        <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        {selected.email || "—"}
                      </a>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Phone &amp; SMS Consent</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`tel:${selected.phone}`}
                          className="text-sm font-semibold text-black hover:underline inline-flex items-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          {selected.phone || "Not provided"}
                        </a>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-sm inline-flex items-center gap-1 ${
                            selected.smsConsent
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-neutral-200 text-neutral-600"
                          }`}
                        >
                          <BellRing className="w-2.5 h-2.5" />
                          {selected.smsConsent ? "SMS Opt-In" : "No SMS Opt-In"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Jurisdiction (City, State, Zip)</p>
                      <p className="text-sm font-semibold text-black inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        {selected.city || selected.state || selected.zipCode
                          ? `${selected.city || ""}${selected.city && selected.state ? ", " : ""}${selected.state || ""} ${selected.zipCode || ""}`.trim()
                          : selected.location}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Preferred Contact Channel</p>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black text-white text-xs font-bold rounded-sm">
                        <MessageSquare className="w-3 h-3" />
                        {getContactMethodLabel(selected.preferredContactMethod)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Legal Case Parameters & Screening Details */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
                    Legal Case Parameters &amp; Screening
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="p-3.5 border border-neutral-200 rounded-sm bg-white">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Urgency Tier
                      </p>
                      <p className="text-sm font-bold text-black mt-1">
                        {getUrgencyMeta(selected.urgency).label}
                      </p>
                    </div>

                    <div className="p-3.5 border border-neutral-200 rounded-sm bg-white">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Key Incident Date
                      </p>
                      <p className="text-sm font-bold text-black mt-1">
                        {selected.incidentDate || "Not specified"}
                      </p>
                    </div>

                    <div className="p-3.5 border border-neutral-200 rounded-sm bg-white">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Budget Expectation
                      </p>
                      <p className="text-sm font-bold text-black mt-1">
                        {getBudgetLabel(selected.budgetRange)}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 border border-neutral-200 bg-neutral-50 rounded-sm space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                      Brief Case Summary / Confidential Dossier Notes
                    </p>
                    <p className="text-sm text-neutral-900 whitespace-pre-wrap leading-relaxed">
                      {selected.description || "No written summary provided."}
                    </p>
                  </div>
                </div>

                {/* Supporting Documents Vault */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
                    Uploaded Documents ({selected.attachments?.length || 0})
                  </h3>

                  {!selected.attachments || selected.attachments.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic bg-neutral-50 p-3.5 border border-neutral-200 rounded-sm">
                      No supporting files were attached with this submission.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selected.attachments.map((att, idx) => {
                        const isPdf = att.mimeType === "application/pdf";
                        return (
                          <div
                            key={`${att.name}-${idx}`}
                            className="flex items-center justify-between gap-3 p-3 border border-neutral-200 bg-white rounded-sm"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {isPdf ? (
                                <div className="w-10 h-10 bg-red-50 border border-red-200 text-red-700 flex items-center justify-center rounded-sm shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 bg-neutral-100 border border-neutral-200 rounded-sm overflow-hidden shrink-0">
                                  <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-black truncate">{att.name}</p>
                                <p className="text-[10px] text-neutral-500">
                                  {isPdf ? "PDF" : "Image"} · {formatBytes(att.size)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewAttachment(att)}
                                className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-sm"
                                title="Preview attachment"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <a
                                href={att.dataUrl}
                                download={att.name}
                                className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-sm"
                                title="Download attachment"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer Workflow Action Bar */}
                <div className="pt-4 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={updatingId === selected.id}
                      onClick={() => handleUpdateStatus(selected, "contacted")}
                      className="px-4 py-2 border border-black text-black text-xs font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors rounded-sm"
                    >
                      Mark Contacted
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === selected.id}
                      onClick={() => handleUpdateStatus(selected, "closed")}
                      className="px-4 py-2 border border-neutral-300 text-neutral-600 text-xs font-bold uppercase tracking-wider hover:border-black hover:text-black transition-colors rounded-sm"
                    >
                      Archive / Close
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Intake ID: {selected.id}
                  </p>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* Document Preview Lightbox Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] flex flex-col rounded-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-black">{previewAttachment.name}</p>
                <p className="text-xs text-neutral-500">{formatBytes(previewAttachment.size)}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewAttachment.dataUrl}
                  download={previewAttachment.name}
                  className="bg-black text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 rounded-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="px-3 py-1.5 border border-neutral-300 text-xs font-bold uppercase tracking-wider hover:border-black rounded-sm"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 bg-neutral-100 p-4 overflow-auto flex items-center justify-center">
              {previewAttachment.mimeType === "application/pdf" ? (
                <iframe
                  src={previewAttachment.dataUrl}
                  title={previewAttachment.name}
                  className="w-full h-[65vh] border border-neutral-300 bg-white"
                />
              ) : (
                <img
                  src={previewAttachment.dataUrl}
                  alt={previewAttachment.name}
                  className="max-w-full max-h-[68vh] object-contain shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

