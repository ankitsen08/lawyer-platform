"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  X,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  DollarSign,
  ShieldAlert,
  Calendar,
  FileCheck2
} from "lucide-react";
import { toast } from "sonner";
import { useContactStore } from "@/store/useContactStore";
import { useAuthStore } from "@/store/useAuthStore";
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

const contactSchema = z.object({
  // Step 1: Contact & Location
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().refine(
    (val) => val.replace(/\D/g, "").length >= 10,
    "Please enter a valid 10-digit US phone number"
  ),
  smsConsent: z.boolean(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(5, "Valid Zip Code is required"),
  preferredContactMethod: z.enum(["email", "phone", "sms", "whatsapp"]),

  // Step 2: Legal Case Parameters
  issue: z.string().min(1, "Please select a primary legal category"),
  subCategory: z.string().optional(),
  urgency: z.enum(["immediate", "this_week", "exploratory"]),
  incidentDate: z.string().optional(),
  description: z.string().min(15, "Please provide a brief case summary (min 15 characters)"),

  // Step 3: Professional & Screening Details
  opposingParty: z.string().optional(),
  budgetRange: z.enum(["under_2k", "2k_5k", "5k_15k", "15k_plus", "contingency", "pro_bono"]),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function ContactModal() {
  const { isOpen, lawyerName, lawyerId, closeContactModal } = useContactStore();
  const { clientSession } = useAuthStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [formState, setFormState] = useState<"idle" | "submitting" | "success">("idle");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      smsConsent: true,
      city: "",
      state: "",
      zipCode: "",
      preferredContactMethod: "email",
      issue: PRIMARY_CATEGORIES[0],
      subCategory: getSubCategories(PRIMARY_CATEGORIES[0])[0],
      urgency: "this_week",
      incidentDate: "",
      description: "",
      opposingParty: "",
      budgetRange: "contingency"
    },
  });

  const phoneVal = watch("phone") || "";
  const smsConsentVal = watch("smsConsent");
  const currentState = watch("state") || "";
  const currentContactMethod = watch("preferredContactMethod");
  const currentIssue = watch("issue");
  const currentSubCategory = watch("subCategory") || "";
  const currentUrgency = watch("urgency");
  const currentBudget = watch("budgetRange");

  const subCategoryOptions = getSubCategorySelectOptions(currentIssue);

  // Auto-fill client details & case profile when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormState("idle");
      const client = clientSession.user;
      const cp = client?.caseProfile;
      const initialCat = cp?.legalCategory && PRIMARY_CATEGORIES.includes(cp.legalCategory)
        ? cp.legalCategory
        : PRIMARY_CATEGORIES[0];

      reset({
        fullName: client?.name || `${client?.firstName || ''} ${client?.lastName || ''}`.trim() || "",
        email: client?.email || "",
        phone: client?.phone || "",
        smsConsent: client?.smsConsent ?? cp?.smsNotifications ?? true,
        city: client?.city || cp?.city || "",
        state: client?.state || cp?.state || "",
        zipCode: client?.zipCode || cp?.zipCode || "",
        preferredContactMethod: normalizeContactMethodClient(client?.preferredContactMethod || cp?.preferredContactMethod),
        issue: initialCat,
        subCategory: cp?.legalSubCategory || getSubCategories(initialCat)[0] || "",
        urgency: normalizeUrgencyClient(cp?.urgency),
        incidentDate: cp?.incidentDate || "",
        description: cp?.notes || "",
        opposingParty: cp?.opposingParty || "",
        budgetRange: normalizeBudgetClient(cp?.budgetRange),
      });

      setAttachments(Array.isArray(cp?.attachments) ? cp.attachments : []);
    }
  }, [isOpen, reset, clientSession]);

  if (!isOpen) return null;

  const handleNextStep = async () => {
    if (step === 1) {
      const ok = await trigger(["fullName", "email", "phone", "city", "state", "zipCode", "preferredContactMethod"]);
      if (ok) setStep(2);
    } else if (step === 2) {
      const ok = await trigger(["issue", "subCategory", "urgency", "incidentDate", "description"]);
      if (ok) setStep(3);
    }
  };

  const onSubmit = async (data: ContactFormValues) => {
    setFormState("submitting");
    
    try {
      const SERVER_URL = getServerUrl();
      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lawyerId: lawyerId || 'general',
          lawyerName: lawyerName || 'Directory Administration',
          clientId: clientSession.user?._id || clientSession.user?.email,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          smsConsent: data.smsConsent,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          preferredContactMethod: data.preferredContactMethod,
          issue: data.issue,
          subCategory: data.subCategory,
          urgency: data.urgency,
          incidentDate: data.incidentDate,
          description: data.description,
          opposingParty: data.opposingParty || '',
          budgetRange: data.budgetRange,
          attachments
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to deliver message");
      }

      setFormState("success");
      toast.success(`Intake dossier sent to ${lawyerName || 'attorney'}.`, {
        description: "They will review conflict clearance and respond via your preferred contact method.",
      });

      setTimeout(() => {
        closeContactModal();
      }, 2400);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to deliver inquiry. Please try again.");
      setFormState("idle");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2.5 sm:p-4 animate-in fade-in duration-200 overflow-y-auto overflow-x-hidden">
      <div className="relative w-full max-w-2xl bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 sm:px-6 py-3.5 sm:py-4 bg-white shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-bold tracking-tight text-gray-900 truncate">
              Confidential Case Intake: {lawyerName}
            </h2>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
              Conflict Screening &amp; Privilege Protected
            </p>
          </div>
          <button 
            type="button"
            onClick={closeContactModal}
            aria-label="Close modal"
            className="text-gray-400 hover:text-gray-900 transition-colors p-1.5 rounded-full hover:bg-gray-100 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 3-Step Progress Bar */}
        {formState !== "success" && (
          <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-3 gap-1.5 sm:gap-2 shrink-0">
            {[
              { num: 1, title: "Contact & Location" },
              { num: 2, title: "Case Parameters" },
              { num: 3, title: "Screening & Docs" }
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  step === s.num ? "bg-black text-white" : step > s.num ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {step > s.num ? "✓" : s.num}
                </div>
                <span className={`text-[11px] sm:text-xs font-semibold truncate ${step === s.num ? "text-gray-900" : "text-gray-500"}`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6 pb-8 overflow-y-auto overflow-x-hidden flex-1">
          {formState === "success" ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Dossier &amp; Inquiry Delivered</h3>
              <p className="text-gray-600 max-w-md text-sm">
                Your contact details, case summary, conflict check, and attached documents have been delivered to {lawyerName}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              {/* STEP 1: CONTACT & LOCATION */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Full Name</label>
                      <input 
                        type="text"
                        autoComplete="name"
                        {...register("fullName")}
                        className={`w-full min-w-0 bg-gray-50 border ${errors.fullName ? 'border-red-500' : 'border-gray-300 focus:border-black'} text-gray-900 px-3.5 py-2.5 text-base sm:text-sm focus:bg-white outline-none rounded-md`}
                        placeholder="John Doe"
                      />
                      {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Email Address</label>
                      <input 
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        {...register("email")}
                        className={`w-full min-w-0 bg-gray-50 border ${errors.email ? 'border-red-500' : 'border-gray-300 focus:border-black'} text-gray-900 px-3.5 py-2.5 text-base sm:text-sm focus:bg-white outline-none rounded-md`}
                        placeholder="john@example.com"
                      />
                      {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Phone Number</label>
                    <input 
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phoneVal}
                      onChange={(e) => setValue("phone", formatPhoneMask(e.target.value), { shouldValidate: true })}
                      className={`w-full min-w-0 bg-gray-50 border ${errors.phone ? 'border-red-500' : 'border-gray-300 focus:border-black'} text-gray-900 px-3.5 py-2.5 text-base sm:text-sm focus:bg-white outline-none rounded-md`}
                      placeholder="(555) 123-4567"
                    />
                    {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}

                    <label className="flex items-start gap-2 pt-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={smsConsentVal}
                        onChange={(e) => setValue("smsConsent", e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 text-black border-gray-300 rounded focus:ring-black"
                      />
                      <span className="text-xs text-gray-600 leading-snug">
                        <strong className="text-gray-900">SMS Notification Consent:</strong> Receive text updates when the firm replies.
                      </span>
                    </label>
                  </div>

                  {/* City, State, Zip */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" /> Location (City, State &amp; Zip Code)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-5 min-w-0">
                        <input
                          type="text"
                          autoComplete="address-level2"
                          {...register("city")}
                          placeholder="City"
                          className={`w-full min-w-0 bg-gray-50 border ${errors.city ? 'border-red-500' : 'border-gray-300 focus:border-black'} px-3 py-2.5 text-base sm:text-sm focus:bg-white outline-none rounded-md`}
                        />
                        {errors.city && <p className="text-[11px] text-red-500 mt-0.5">{errors.city.message}</p>}
                      </div>
                      <div className="sm:col-span-4 min-w-0">
                        <ResponsiveSelect
                          value={currentState}
                          onChange={(val) => setValue("state", val, { shouldValidate: true })}
                          options={STATE_SELECT_OPTIONS}
                          placeholder="State..."
                          searchPlaceholder="Search state or code..."
                          error={Boolean(errors.state)}
                          ariaLabel="State"
                          triggerClassName="bg-gray-50 px-3 py-2.5 rounded-md focus:bg-white"
                        />
                        {errors.state && <p className="text-[11px] text-red-500 mt-0.5">{errors.state.message}</p>}
                      </div>
                      <div className="sm:col-span-3 min-w-0">
                        <input
                          type="text"
                          autoComplete="postal-code"
                          inputMode="numeric"
                          maxLength={10}
                          {...register("zipCode")}
                          placeholder="Zip Code"
                          className={`w-full min-w-0 bg-gray-50 border ${errors.zipCode ? 'border-red-500' : 'border-gray-300 focus:border-black'} px-3 py-2.5 text-base sm:text-sm focus:bg-white outline-none rounded-md`}
                        />
                        {errors.zipCode && <p className="text-[11px] text-red-500 mt-0.5">{errors.zipCode.message}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Preferred Contact Method */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Preferred Contact Method</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {CONTACT_METHODS.map((method) => {
                        const Icon = method.id === "email" ? Mail : method.id === "phone" ? Phone : MessageSquare;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setValue("preferredContactMethod", method.id)}
                            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 border rounded-md text-xs font-bold transition-all ${
                              currentContactMethod === method.id
                                ? "border-black bg-black text-white shadow-sm"
                                : "border-gray-200 bg-gray-50 text-gray-700 hover:border-black hover:bg-white"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            {method.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-sm"
                    >
                      Continue to Legal Case Parameters
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: LEGAL CASE PARAMETERS */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Primary Legal Category</label>
                      <ResponsiveSelect
                        value={currentIssue}
                        onChange={(cat) => {
                          setValue("issue", cat, { shouldValidate: true });
                          setValue("subCategory", getSubCategories(cat)[0] || "");
                        }}
                        options={CATEGORY_SELECT_OPTIONS}
                        placeholder="Select category..."
                        searchPlaceholder="Filter categories..."
                        ariaLabel="Primary Legal Category"
                        triggerClassName="bg-gray-50 px-3 py-2.5 rounded-md focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Sub-Category</label>
                      <ResponsiveSelect
                        value={currentSubCategory}
                        onChange={(sub) => setValue("subCategory", sub)}
                        options={subCategoryOptions}
                        placeholder="Select sub-category..."
                        searchable={false}
                        ariaLabel="Sub-Category"
                        triggerClassName="bg-gray-50 px-3 py-2.5 rounded-md focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Case Urgency Tier */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" /> Case Urgency Tier
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {URGENCY_TIERS.map((urg) => (
                        <button
                          key={urg.id}
                          type="button"
                          onClick={() => setValue("urgency", urg.id)}
                          className={`p-2.5 border rounded-md text-left transition-all ${
                            currentUrgency === urg.id
                              ? "border-black bg-black text-white shadow-sm"
                              : "border-gray-200 bg-gray-50 text-gray-700 hover:border-black hover:bg-white"
                          }`}
                        >
                          <p className="text-xs font-bold">{urg.label}</p>
                          <p className={`text-[10px] mt-0.5 ${currentUrgency === urg.id ? "text-gray-300" : "text-gray-500"}`}>
                            {urg.sub}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Key Incident Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" /> Key Incident Date (Optional)
                    </label>
                    <ResponsiveDatePicker
                      value={watch("incidentDate") || ""}
                      onChange={(val) => setValue("incidentDate", val, { shouldDirty: true })}
                      placeholder="Select incident date..."
                      ariaLabel="Key Incident Date"
                      triggerClassName="bg-gray-50 px-3 py-2.5 rounded-md focus:bg-white"
                    />
                  </div>

                  {/* Brief Case Summary */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Brief Case Summary</label>
                    <textarea
                      {...register("description")}
                      rows={3}
                      className={`w-full min-w-0 bg-gray-50 border ${errors.description ? 'border-red-500' : 'border-gray-300 focus:border-black'} px-3.5 py-2.5 text-base sm:text-sm rounded-md outline-none focus:bg-white resize-none`}
                      placeholder="Describe what happened, relevant dates, and the outcome you need..."
                    />
                    {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
                  </div>

                  <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold rounded-lg text-sm flex items-center justify-center gap-1"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-sm"
                    >
                      Continue to Screening &amp; Docs
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PROFESSIONAL & SCREENING DETAILS */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex flex-wrap items-center justify-between gap-1">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-neutral-500 shrink-0" /> Opposing Party / Entity Name (Optional)
                      </span>
                      <span className="text-[10px] text-neutral-500 font-normal">Optional — if known</span>
                    </label>
                    <input
                      type="text"
                      {...register("opposingParty")}
                      placeholder="Optional — e.g., Acme Corp, State Insurance, or leave blank if unknown"
                      className="w-full min-w-0 bg-gray-50 border border-gray-300 focus:border-black px-3.5 py-2.5 text-base sm:text-sm rounded-md outline-none focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-gray-500 shrink-0" /> Budget Expectation Range
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {BUDGET_RANGES.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setValue("budgetRange", b.id)}
                          className={`p-2.5 border rounded-md text-left transition-all ${
                            currentBudget === b.id
                              ? "border-black bg-black text-white shadow-sm"
                              : "border-gray-200 bg-gray-50 text-gray-700 hover:border-black hover:bg-white"
                          }`}
                        >
                          <p className="text-xs font-bold">{b.label}</p>
                          <p className={`text-[10px] mt-0.5 ${currentBudget === b.id ? "text-gray-300" : "text-gray-500"}`}>
                            {b.sub}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-gray-500 shrink-0" /> Optional Document Attachments (PDF / Images)
                    </label>
                    <DocumentDropzone attachments={attachments} onChange={setAttachments} compact />
                  </div>

                  <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold rounded-lg text-sm flex items-center justify-center gap-1"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={formState === "submitting"}
                      className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-70 text-sm"
                    >
                      {formState === "submitting" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting Case Intake...
                        </>
                      ) : (
                        "Submit Confidential Case Intake"
                      )}
                    </button>
                  </div>
                </div>
              )}

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
