"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Loader2,
  Briefcase,
  ShieldCheck,
  Clock,
  DollarSign,
  Video,
  BellRing,
  Save,
  Phone,
  MapPin,
  MessageSquare,
  ShieldAlert,
  FileCheck2,
  Calendar,
  ArrowRight,
  ArrowLeft,
  CheckCircle2
} from "lucide-react";
import { getServerUrl } from "@/utils/apiUrl";
import {
  AttachmentItem,
  BUDGET_RANGES,
  CATEGORY_SELECT_OPTIONS,
  CONTACT_METHODS,
  PRIMARY_CATEGORIES,
  STATE_SELECT_OPTIONS,
  URGENCY_TIERS,
  formatPhoneMask,
  getSubCategories,
  getSubCategorySelectOptions,
  normalizeBudgetClient,
  normalizeContactMethodClient,
  normalizeUrgencyClient
} from "@/utils/legalData";
import DocumentDropzone from "@/components/shared/DocumentDropzone";
import ResponsiveSelect from "@/components/shared/ResponsiveSelect";
import ResponsiveDatePicker from "@/components/shared/ResponsiveDatePicker";

const caseProfileSchema = z.object({
  // 1. Contact & Location
  phone: z.string().optional(),
  smsNotifications: z.boolean(),
  city: z.string().max(80).optional(),
  state: z.string().max(40).optional(),
  zipCode: z.string().max(10).optional(),
  preferredContactMethod: z.enum(["email", "phone", "sms", "whatsapp"]),

  // 2. Legal Case Parameters
  legalCategory: z.string().min(1, "Please select your primary legal category"),
  legalSubCategory: z.string().optional(),
  urgency: z.enum(["immediate", "this_week", "exploratory"]),
  incidentDate: z.string().optional(),
  notes: z.string().max(2500, "Case summary cannot exceed 2500 characters").optional(),

  // 3. Professional & Screening Details
  opposingParty: z.string().max(150).optional(),
  budgetRange: z.enum(["under_2k", "2k_5k", "5k_15k", "15k_plus", "contingency", "pro_bono"]),
  preferredFormat: z.enum(["zoom", "phone", "in_person"]),
});

type CaseProfileFormValues = z.infer<typeof caseProfileSchema>;

export default function ClientCaseProfileTab() {
  const { clientSession, loginClient } = useAuthStore();
  const { user } = clientSession;
  const [activeWizardStep, setActiveWizardStep] = useState<1 | 2 | 3>(1);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty }
  } = useForm<CaseProfileFormValues>({
    resolver: zodResolver(caseProfileSchema),
    defaultValues: {
      phone: user?.phone || "",
      smsNotifications: user?.smsConsent ?? user?.caseProfile?.smsNotifications ?? true,
      city: user?.city || user?.caseProfile?.city || "",
      state: user?.state || user?.caseProfile?.state || "",
      zipCode: user?.zipCode || user?.caseProfile?.zipCode || "",
      preferredContactMethod: normalizeContactMethodClient(user?.preferredContactMethod || user?.caseProfile?.preferredContactMethod),
      legalCategory: user?.caseProfile?.legalCategory || PRIMARY_CATEGORIES[0],
      legalSubCategory: user?.caseProfile?.legalSubCategory || getSubCategories(PRIMARY_CATEGORIES[0])[0],
      urgency: normalizeUrgencyClient(user?.caseProfile?.urgency),
      incidentDate: user?.caseProfile?.incidentDate || "",
      notes: user?.caseProfile?.notes || "",
      opposingParty: user?.caseProfile?.opposingParty || "",
      budgetRange: normalizeBudgetClient(user?.caseProfile?.budgetRange),
      preferredFormat: (user?.caseProfile?.preferredFormat as "zoom" | "phone" | "in_person") || "zoom",
    }
  });

  const phoneVal = watch("phone") || "";
  const cityVal = watch("city") || "";
  const stateVal = watch("state") || "";
  const zipVal = watch("zipCode") || "";
  const selectedContactMethod = watch("preferredContactMethod");
  const selectedCategory = watch("legalCategory");
  const selectedSubCategory = watch("legalSubCategory") || "";
  const selectedUrgency = watch("urgency");
  const incidentDateVal = watch("incidentDate") || "";
  const notesVal = watch("notes") || "";
  const opposingPartyVal = watch("opposingParty") || "";
  const selectedBudget = watch("budgetRange");
  const selectedFormat = watch("preferredFormat");
  const smsEnabled = watch("smsNotifications");

  const subCategoryOptions = getSubCategorySelectOptions(selectedCategory);

  // Calculate completion meter
  const completionChecks = [
    Boolean(phoneVal.replace(/\D/g, "").length >= 10),
    Boolean(cityVal && stateVal && zipVal),
    Boolean(selectedCategory),
    Boolean(notesVal.trim().length >= 10),
    Boolean(opposingPartyVal.trim()),
    Boolean(incidentDateVal),
    Boolean(selectedBudget)
  ];
  const completionPercent = Math.round(
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100
  );

  // Load dossier + contact/location from backend
  useEffect(() => {
    let isCancelled = false;

    async function loadCaseProfile() {
      if (!user) return;
      try {
        setIsLoading(true);
        const SERVER_URL = getServerUrl();
        const clientId = user._id || user.email;
        const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/clients/${clientId}/case-profile`, {
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          const cp = data.caseProfile || {};
          const contact = data.contact || {};
          if (!isCancelled) {
            const loadedCategory = PRIMARY_CATEGORIES.includes(cp.legalCategory)
              ? cp.legalCategory
              : (cp.legalCategory || PRIMARY_CATEGORIES[0]);
            const subs = getSubCategories(loadedCategory);

            reset({
              phone: contact.phone || user.phone || "",
              smsNotifications: contact.smsConsent ?? cp.smsNotifications ?? true,
              city: contact.city || cp.city || user.city || "",
              state: contact.state || cp.state || user.state || "",
              zipCode: contact.zipCode || cp.zipCode || user.zipCode || "",
              preferredContactMethod: normalizeContactMethodClient(contact.preferredContactMethod || cp.preferredContactMethod),
              legalCategory: loadedCategory,
              legalSubCategory: cp.legalSubCategory || subs[0] || "",
              urgency: normalizeUrgencyClient(cp.urgency),
              incidentDate: cp.incidentDate || "",
              notes: cp.notes || "",
              opposingParty: cp.opposingParty || "",
              budgetRange: normalizeBudgetClient(cp.budgetRange),
              preferredFormat: (cp.preferredFormat as "zoom" | "phone" | "in_person") || "zoom"
            });

            if (Array.isArray(cp.attachments)) {
              setAttachments(cp.attachments);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load case profile:", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadCaseProfile();
    return () => { isCancelled = true; };
  }, [user?._id, user?.email, reset]);

  const onSubmit = async (data: CaseProfileFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const SERVER_URL = getServerUrl();
      const clientId = user._id || user.email;

      const payload = {
        ...data,
        smsConsent: data.smsNotifications,
        attachments
      };

      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/clients/${clientId}/case-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to save case dossier");
      }

      // Synchronize client auth store
      loginClient({
        ...user,
        phone: result.contact?.phone ?? data.phone,
        smsConsent: result.contact?.smsConsent ?? data.smsNotifications,
        city: result.contact?.city ?? data.city,
        state: result.contact?.state ?? data.state,
        zipCode: result.contact?.zipCode ?? data.zipCode,
        location: result.contact?.location ?? user.location,
        preferredContactMethod: result.contact?.preferredContactMethod ?? data.preferredContactMethod,
        caseProfile: result.caseProfile || { ...data, attachments }
      });

      toast.success("Case profile & intake dossier saved", {
        description: "Your updated details and screening files are synced for attorney review."
      });
      reset(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save changes. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mb-3" />
        <p className="text-sm text-neutral-500 font-medium">Loading case profile &amp; dossier...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 lg:p-12 max-w-5xl mx-auto w-full min-w-0">
      
      {/* Header */}
      <div className="mb-6 border-b border-color-border-light pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-black text-white rounded-sm shrink-0">
              <Briefcase className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-color-foreground">
              Case Profile &amp; Intake Dossier
            </h1>
          </div>
          <p className="mt-2 text-color-text-muted text-sm max-w-2xl">
            Manage your jurisdictional location, contact preferences, case timeline, conflict screening, and supporting legal documents in one place.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 text-green-800 rounded text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
            <span>Privileged &amp; Encrypted</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
            <span>Dossier Readiness:</span>
            <span className="bg-black text-white px-2 py-0.5 rounded-sm">{completionPercent}%</span>
          </div>
        </div>
      </div>

      {/* Wizard Progress Step Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-6">
        {[
          { step: 1 as const, label: "1. Contact & Location", icon: MapPin },
          { step: 2 as const, label: "2. Legal Case Parameters", icon: Briefcase },
          { step: 3 as const, label: "3. Screening & Documents", icon: ShieldAlert }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeWizardStep === item.step;
          return (
            <button
              key={item.step}
              type="button"
              onClick={() => setActiveWizardStep(item.step)}
              className={`flex items-center justify-center gap-2 p-3 sm:p-3.5 border text-xs font-bold uppercase tracking-wider transition-all rounded-sm ${
                isActive
                  ? "bg-black text-white border-black shadow-sm"
                  : "bg-white text-neutral-600 border-color-border-light hover:border-black hover:text-black"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-color-border-light p-4 sm:p-6 md:p-8 shadow-sm rounded-sm space-y-8">
        
        {/* STEP 1: CONTACT & LOCATION INFORMATION */}
        {activeWizardStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-color-foreground">Contact &amp; Jurisdictional Location</h2>
              <p className="text-xs text-color-text-muted mt-0.5">Ensures matched attorneys are bar-licensed in your state and contact you on your preferred channel.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-color-foreground flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-neutral-500 shrink-0" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phoneVal}
                  onChange={(e) => setValue("phone", formatPhoneMask(e.target.value), { shouldDirty: true })}
                  placeholder="(555) 123-4567"
                  className="w-full min-w-0 bg-neutral-50 border border-color-border-light px-3.5 sm:px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-black focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-color-foreground flex items-center gap-1.5">
                  <BellRing className="w-4 h-4 text-neutral-500 shrink-0" />
                  SMS Notification Consent
                </label>
                <label className="flex items-start sm:items-center gap-3 p-2.5 bg-neutral-50 border border-color-border-light rounded-sm cursor-pointer hover:bg-neutral-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={smsEnabled}
                    onChange={(e) => setValue("smsNotifications", e.target.checked, { shouldDirty: true })}
                    className="mt-0.5 sm:mt-0 w-4 h-4 shrink-0 text-black focus:ring-black border-gray-300 rounded"
                  />
                  <div>
                    <p className="text-xs font-bold text-color-foreground">I consent to SMS case reminders</p>
                    <p className="text-[10px] text-color-text-muted">Receive instant text alerts when lawyers reply or schedule hearings.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* City, State, Zip */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-color-foreground flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-neutral-500 shrink-0" />
                Location (City, State &amp; Zip Code)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
                <div className="sm:col-span-5 min-w-0">
                  <input
                    type="text"
                    autoComplete="address-level2"
                    {...register("city")}
                    placeholder="City (e.g. New York)"
                    className="w-full min-w-0 bg-neutral-50 border border-color-border-light px-3.5 sm:px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-black focus:bg-white transition-colors"
                  />
                </div>
                <div className="sm:col-span-4 min-w-0">
                  <ResponsiveSelect
                    value={stateVal}
                    onChange={(val) => setValue("state", val, { shouldDirty: true })}
                    options={STATE_SELECT_OPTIONS}
                    placeholder="Select State..."
                    searchPlaceholder="Search state or code..."
                    ariaLabel="State"
                    triggerClassName="bg-neutral-50 px-3.5 sm:px-4 py-3 focus:bg-white"
                  />
                </div>
                <div className="sm:col-span-3 min-w-0">
                  <input
                    type="text"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    maxLength={10}
                    {...register("zipCode")}
                    placeholder="Zip (e.g. 10005)"
                    className="w-full min-w-0 bg-neutral-50 border border-color-border-light px-3.5 sm:px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-black focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Preferred Contact Method & Consultation Preference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-color-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-neutral-500 shrink-0" />
                  Preferred Contact Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CONTACT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setValue("preferredContactMethod", method.id, { shouldDirty: true })}
                      className={`py-2.5 px-2 border text-center text-xs font-bold rounded-sm transition-all ${
                        selectedContactMethod === method.id
                          ? "border-black bg-black text-white shadow-sm"
                          : "border-color-border-light bg-neutral-50 text-neutral-700 hover:border-black hover:bg-white"
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-color-foreground flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-neutral-500 shrink-0" />
                  Default Consultation Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "zoom", label: "Zoom Video" },
                    { id: "phone", label: "Phone Call" },
                    { id: "in_person", label: "In-Person" }
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setValue("preferredFormat", fmt.id as any, { shouldDirty: true })}
                      className={`py-2.5 px-2 border text-center text-xs font-semibold rounded-sm transition-all ${
                        selectedFormat === fmt.id
                          ? "border-black bg-black text-white font-bold"
                          : "border-color-border-light bg-neutral-50 text-neutral-700 hover:border-black hover:bg-white"
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveWizardStep(2)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-neutral-900 text-white px-5 py-3 sm:py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors rounded-sm"
              >
                Next: Legal Case Parameters <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: LEGAL CASE PARAMETERS */}
        {activeWizardStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-color-foreground">Legal Case Parameters</h2>
              <p className="text-xs text-color-text-muted mt-0.5">Define your matter specialty, urgency timeline, key dates, and background summary.</p>
            </div>

            {/* Category & Sub-Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-color-foreground flex items-center justify-between">
                  <span>Primary Legal Category</span>
                  <span className="text-red-500 text-[11px] font-normal">*Required</span>
                </label>
                <ResponsiveSelect
                  value={selectedCategory}
                  onChange={(nextCat) => {
                    setValue("legalCategory", nextCat, { shouldDirty: true });
                    const subs = getSubCategories(nextCat);
                    setValue("legalSubCategory", subs[0] || "", { shouldDirty: true });
                  }}
                  options={CATEGORY_SELECT_OPTIONS}
                  placeholder="Select category..."
                  searchPlaceholder="Filter categories..."
                  error={Boolean(errors.legalCategory)}
                  ariaLabel="Primary Legal Category"
                  triggerClassName="bg-neutral-50 px-3.5 sm:px-4 py-3 focus:bg-white"
                />
                {errors.legalCategory && <p className="text-xs text-red-600">{errors.legalCategory.message}</p>}
              </div>

              <div className="space-y-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-color-foreground">
                  Sub-Category
                </label>
                <ResponsiveSelect
                  value={selectedSubCategory}
                  onChange={(val) => setValue("legalSubCategory", val, { shouldDirty: true })}
                  options={subCategoryOptions}
                  placeholder="Select sub-category..."
                  searchable={false}
                  ariaLabel="Sub-Category"
                  triggerClassName="bg-neutral-50 px-3.5 sm:px-4 py-3 focus:bg-white"
                />
              </div>
            </div>

            {/* Case Urgency Tier */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-color-foreground flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-neutral-500 shrink-0" />
                Case Urgency Tier
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {URGENCY_TIERS.map((urg) => (
                  <button
                    key={urg.id}
                    type="button"
                    onClick={() => setValue("urgency", urg.id, { shouldDirty: true })}
                    className={`p-3.5 border text-left transition-all rounded-sm ${
                      selectedUrgency === urg.id
                        ? "border-black bg-black text-white shadow-sm"
                        : "border-color-border-light bg-neutral-50 text-neutral-700 hover:border-black hover:bg-white"
                    }`}
                  >
                    <p className="text-xs font-bold">{urg.label}</p>
                    <p className={`text-[10px] mt-0.5 ${selectedUrgency === urg.id ? "text-neutral-300" : "text-neutral-500"}`}>
                      {urg.sub}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Key Incident Date */}
            <div className="space-y-2 max-w-md">
              <label className="text-xs font-bold uppercase tracking-wider text-color-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-neutral-500 shrink-0" />
                Key Incident Date / Limitation Trigger
              </label>
              <ResponsiveDatePicker
                value={incidentDateVal}
                onChange={(val) => setValue("incidentDate", val, { shouldDirty: true })}
                placeholder="Select incident date..."
                ariaLabel="Key Incident Date / Limitation Trigger"
                triggerClassName="bg-neutral-50 px-3.5 sm:px-4 py-3 focus:bg-white"
              />
              <p className="text-[11px] text-color-text-muted">
                Allows reviewing attorneys to calculate statutory limitation periods and court filing deadlines.
              </p>
            </div>

            {/* Brief Case Summary */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-color-foreground flex justify-between">
                <span>Brief Case Summary</span>
                <span className="text-[11px] text-neutral-400 font-normal">{notesVal.length}/2500 characters</span>
              </label>
              <textarea
                {...register("notes")}
                rows={4}
                placeholder="Summarize the key facts, timeline, parties involved, and your desired legal resolution..."
                className="w-full min-w-0 bg-neutral-50 border border-color-border-light p-3.5 sm:p-4 text-base sm:text-sm focus:outline-none focus:border-black focus:bg-white transition-colors resize-none rounded-sm"
              />
              {errors.notes && <p className="text-xs text-red-600">{errors.notes.message}</p>}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveWizardStep(1)}
                className="inline-flex items-center justify-center gap-2 border border-neutral-300 text-neutral-700 px-5 py-3 sm:py-2.5 text-xs font-bold uppercase tracking-widest hover:border-black hover:text-black transition-colors rounded-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>
              <button
                type="button"
                onClick={() => setActiveWizardStep(3)}
                className="inline-flex items-center justify-center gap-2 bg-neutral-900 text-white px-5 py-3 sm:py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors rounded-sm"
              >
                Next: Screening &amp; Documents <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PROFESSIONAL & SCREENING DETAILS */}
        {activeWizardStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-color-foreground">Conflict Screening, Budget &amp; Documents</h2>
              <p className="text-xs text-color-text-muted mt-0.5">Complete pre-consultation conflict clearance and optionally attach case documents.</p>
            </div>

            {/* Opposing Party Conflict Check */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-color-foreground flex flex-wrap items-center justify-between gap-1">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-neutral-500 shrink-0" />
                  Opposing Party / Entity Name (Optional)
                </span>
                <span className="text-[11px] text-neutral-500 font-normal">Optional — conflict check if known</span>
              </label>
              <input
                type="text"
                {...register("opposingParty")}
                placeholder="Optional — e.g. Acme Corp, Insurance Carrier, or leave blank if unknown"
                className="w-full min-w-0 bg-neutral-50 border border-color-border-light px-3.5 sm:px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-black focus:bg-white transition-colors"
              />
              <p className="text-[11px] text-color-text-muted">
                Optional. If known, attorneys screen this name against their client registry to confirm zero conflict of interest prior to case review.
              </p>
            </div>

            {/* Budget Expectation Range */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-color-foreground flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-neutral-500 shrink-0" />
                Budget Expectation Range
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {BUDGET_RANGES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setValue("budgetRange", b.id, { shouldDirty: true })}
                    className={`p-3 border text-left transition-all rounded-sm ${
                      selectedBudget === b.id
                        ? "border-black bg-black text-white shadow-sm"
                        : "border-color-border-light bg-neutral-50 text-neutral-700 hover:border-black hover:bg-white"
                    }`}
                  >
                    <p className="text-xs font-bold">{b.label}</p>
                    <p className={`text-[10px] mt-0.5 ${selectedBudget === b.id ? "text-neutral-300" : "text-neutral-500"}`}>
                      {b.sub}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Document Attachment Dropzone */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-color-foreground flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-neutral-500 shrink-0" />
                Optional Document Attachment Dropzone (PDF / Images)
              </label>
              <DocumentDropzone attachments={attachments} onChange={setAttachments} />
            </div>

            <div className="flex justify-start pt-1">
              <button
                type="button"
                onClick={() => setActiveWizardStep(2)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-neutral-300 text-neutral-700 px-5 py-3 sm:py-2.5 text-xs font-bold uppercase tracking-widest hover:border-black hover:text-black transition-colors rounded-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Previous Step
              </button>
            </div>
          </div>
        )}

        {/* Submit Footer Bar (Available from every step) */}
        <div className="pt-5 border-t border-color-border-light flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-color-text-muted">
            {isDirty ? (
              <span className="text-amber-700 font-semibold">You have unsaved dossier updates</span>
            ) : (
              <span className="flex items-center gap-1.5 text-green-700 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> All saved sections synced with server
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-black text-white px-8 py-3.5 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Dossier...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Complete Case Profile
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
