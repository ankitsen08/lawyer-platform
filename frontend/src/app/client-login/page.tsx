"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Briefcase,
  Clock,
  Calendar,
  ShieldAlert,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  Loader2,
  FileCheck2
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
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
  getSubCategorySelectOptions
} from "@/utils/legalData";
import DocumentDropzone from "@/components/shared/DocumentDropzone";
import ResponsiveSelect from "@/components/shared/ResponsiveSelect";
import ResponsiveDatePicker from "@/components/shared/ResponsiveDatePicker";

const WIZARD_STEPS = [
  { num: 1, title: "Credentials" },
  { num: 2, title: "Contact & Location" },
  { num: 3, title: "Case Details" },
  { num: 4, title: "Screening & Docs" }
] as const;

export default function ClientLoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Account Credentials
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: Contact & Location Information
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(true);
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState<"email" | "phone" | "sms" | "whatsapp">("email");

  // Step 3: Legal Case Parameters
  const [legalCategory, setLegalCategory] = useState(PRIMARY_CATEGORIES[0]);
  const [legalSubCategory, setLegalSubCategory] = useState(getSubCategories(PRIMARY_CATEGORIES[0])[0]);
  const [urgency, setUrgency] = useState<"immediate" | "this_week" | "exploratory">("this_week");
  const [incidentDate, setIncidentDate] = useState("");
  const [caseSummary, setCaseSummary] = useState("");

  // Step 4: Professional & Screening Details
  const [opposingParty, setOpposingParty] = useState("");
  const [budgetRange, setBudgetRange] = useState<"under_2k" | "2k_5k" | "5k_15k" | "15k_plus" | "contingency" | "pro_bono">("contingency");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const router = useRouter();
  const { loginClient, clearClientSession } = useAuthStore();

  const handleCategoryChange = (nextCat: string) => {
    setLegalCategory(nextCat);
    const subs = getSubCategories(nextCat);
    setLegalSubCategory(subs[0] || "");
  };

  const handlePhoneChange = (val: string) => {
    setPhone(formatPhoneMask(val));
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!name.trim() || name.trim().length < 2) {
        toast.error("Please enter your full name (minimum 2 characters).");
        return false;
      }
      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        toast.error("Please enter a valid email address.");
        return false;
      }
      if (cleanEmail.endsWith("@gmial.com") || cleanEmail.endsWith("@gamil.com") || cleanEmail.endsWith("@gmai.com") || cleanEmail.endsWith("@gmaill.com")) {
        toast.error("Please check your email spelling: did you mean @gmail.com?");
        return false;
      }
      if (cleanEmail.endsWith("@hotmial.com") || cleanEmail.endsWith("@yaho.com") || cleanEmail.endsWith("@outlok.com")) {
        toast.error("Please check your email domain spelling.");
        return false;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters long.");
        return false;
      }
      return true;
    }

    if (step === 2) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) {
        toast.error("Please enter a valid 10-digit phone number.");
        return false;
      }
      if (!city.trim() || !stateCode.trim()) {
        toast.error("Please enter your City and State for jurisdictional matching.");
        return false;
      }
      if (!/^[A-Za-z0-9\s-]{5,10}$/.test(zipCode.trim())) {
        toast.error("Please enter a valid 5-digit Zip Code.");
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!legalCategory) {
        toast.error("Please select your primary legal category.");
        return false;
      }
      if (caseSummary.trim().length > 0 && caseSummary.trim().length < 10) {
        toast.error("Please add a slightly more detailed case summary (at least 10 characters).");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(wizardStep)) {
      setWizardStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev));
    }
  };

  const submitRegistrationOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      if (!email.trim() || !password) {
        toast.error("Please enter your email address and password.");
        return;
      }
    } else {
      if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const SERVER_URL = getServerUrl();
      const baseUrl = SERVER_URL.replace("ws://", "http://").replace("wss://", "https://");
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      const firstName = cleanName ? cleanName.split(" ")[0] : "";
      const lastName = cleanName ? cleanName.split(" ").slice(1).join(" ") : "";

      // Purge stale client session cache prior to authentication
      clearClientSession();

      const payload = isLogin
        ? { email: cleanEmail, password, role: "client" }
        : {
            email: cleanEmail,
            password,
            role: "client",
            name: cleanName,
            firstName,
            lastName,
            phone,
            smsConsent,
            smsNotifications: smsConsent,
            city: city.trim(),
            state: stateCode.trim(),
            zipCode: zipCode.trim(),
            preferredContactMethod,
            legalCategory,
            legalSubCategory,
            urgency,
            incidentDate,
            notes: caseSummary.trim(),
            opposingParty: opposingParty.trim(),
            budgetRange,
            attachments
          };

      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error("Account already exists with this email.", {
            description: "Switched to Sign In. Please enter your password to access your account.",
            duration: 6000
          });
          setIsLogin(true);
          setWizardStep(1);
          return;
        }
        throw new Error(data.error || "Authentication failed");
      }

      loginClient(data.user, data.token);

      toast.success(isLogin ? "Welcome back!" : "Account & Case Dossier Created!", {
        description: `Logged in as ${data.user.name || data.user.email}`
      });

      router.push("/client-dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to authenticate. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setWizardStep(1);
  };

  const subCategoryOptions = getSubCategorySelectOptions(legalCategory);

  return (
    <div className="min-h-[85vh] w-full bg-color-background flex items-center justify-center px-3 sm:px-6 py-6 sm:py-12 overflow-x-hidden">
      <div className={`w-full min-w-0 transition-all duration-300 ${isLogin ? "max-w-md" : "max-w-2xl"}`}>
        
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-color-text-muted hover:text-color-foreground mb-5 sm:mb-6 transition-minimal"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="border border-color-border-light border-t-4 border-t-black bg-white p-4 sm:p-8 shadow-2xl relative">
          <div className="mb-6 flex flex-col items-center text-center mt-1 sm:mt-2">
            <div className="h-12 w-12 border-2 border-black flex items-center justify-center mb-4">
              {isLogin ? <User className="h-6 w-6 text-black" /> : <Briefcase className="h-6 w-6 text-black" />}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-color-foreground">
              {isLogin ? "Client Portal" : "Create Client Account & Case Profile"}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-color-text-muted max-w-md">
              {isLogin 
                ? "Sign in to manage your saved attorneys and consultations."
                : "Complete our progressive intake wizard once for faster conflict checks and jurisdictional attorney matching."}
            </p>
          </div>

          {/* Progressive Wizard Progress Indicator (Signup Mode) */}
          {!isLogin && (
            <div className="mb-6 sm:mb-8 border-y border-neutral-100 py-3.5 sm:py-4">
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {WIZARD_STEPS.map((step) => {
                  const isActive = wizardStep === step.num;
                  const isCompleted = wizardStep > step.num;
                  return (
                    <button
                      key={step.num}
                      type="button"
                      onClick={() => {
                        if (step.num < wizardStep || validateStep(wizardStep)) {
                          setWizardStep(step.num);
                        }
                      }}
                      className="flex flex-col items-center text-center group min-w-0"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all mb-1.5 shrink-0 ${
                          isActive
                            ? "bg-black text-white ring-4 ring-neutral-100"
                            : isCompleted
                            ? "bg-green-600 text-white"
                            : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                        }`}
                      >
                        {isCompleted ? "✓" : step.num}
                      </div>
                      <span
                        className={`text-[10px] sm:text-xs font-bold tracking-tight sm:tracking-wide leading-tight break-words w-full ${
                          isActive ? "text-black" : isCompleted ? "text-green-700" : "text-neutral-400"
                        }`}
                      >
                        {step.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={submitRegistrationOrLogin} className="space-y-5">
            
            {/* LOGIN FORM OR WIZARD STEP 1 */}
            {(isLogin || wizardStep === 1) && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {!isLogin && (
                  <div className="space-y-1">
                    <label className="font-bold text-color-foreground uppercase tracking-widest text-[10px] flex justify-between">
                      <span>Full Name</span>
                      <span className="text-red-500 font-normal">*Required</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <input 
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full min-w-0 border border-color-border-light bg-transparent pl-10 pr-4 py-3 text-base sm:text-sm focus:border-black focus:outline-none transition-minimal"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-color-foreground uppercase tracking-widest text-[10px] flex justify-between">
                    <span>Email Address</span>
                    {!isLogin && <span className="text-red-500 font-normal">*Required</span>}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input 
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full min-w-0 border border-color-border-light bg-transparent pl-10 pr-4 py-3 text-base sm:text-sm focus:border-black focus:outline-none transition-minimal"
                      placeholder="client@example.com"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-color-foreground uppercase tracking-widest text-[10px]">
                      Password {!isLogin && <span className="text-neutral-400 font-normal lowercase tracking-normal">(min 6 chars)</span>}
                    </label>
                    {isLogin && (
                      <Link href="#" className="text-[10px] font-bold text-color-text-muted hover:text-black uppercase tracking-widest transition-colors">
                        Forgot?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input 
                      type="password"
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full min-w-0 border border-color-border-light bg-transparent pl-10 pr-4 py-3 text-base sm:text-sm focus:border-black focus:outline-none transition-minimal"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {isLogin ? (
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-black text-white px-4 py-3.5 text-sm font-bold uppercase tracking-widest shadow-md hover:opacity-90 transition-minimal mt-4 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In Securely"}
                  </button>
                ) : (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="w-full bg-black text-white px-4 py-3.5 text-xs font-bold uppercase tracking-widest shadow-md hover:bg-neutral-800 transition-minimal flex items-center justify-center gap-2"
                    >
                      Continue to Contact & Location
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* WIZARD STEP 2: CONTACT & LOCATION INFORMATION */}
            {!isLogin && wizardStep === 2 && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <label className="font-bold text-color-foreground uppercase tracking-widest text-[10px] flex justify-between">
                    <span>Phone Number</span>
                    <span className="text-red-500 font-normal">*Required</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full min-w-0 border border-color-border-light bg-transparent pl-10 pr-4 py-3 text-base sm:text-sm focus:border-black focus:outline-none transition-minimal"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={smsConsent}
                      onChange={(e) => setSmsConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 text-black border-neutral-300 rounded focus:ring-black"
                    />
                    <span className="text-xs text-neutral-600 leading-snug">
                      <strong className="text-neutral-900">SMS Notification Consent:</strong> Send me instant text updates when an attorney replies or clears conflict checks.
                    </span>
                  </label>
                </div>

                {/* Location: City, State, Zip Code */}
                <div className="space-y-2 pt-1">
                  <label className="font-bold text-color-foreground uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    Jurisdictional Location (For Bar-Licensed Matching)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5 min-w-0">
                      <input
                        type="text"
                        autoComplete="address-level2"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City (e.g. New York)"
                        className="w-full min-w-0 border border-color-border-light bg-transparent px-3.5 py-2.5 text-base sm:text-sm focus:border-black focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-4 min-w-0">
                      <ResponsiveSelect
                        value={stateCode}
                        onChange={setStateCode}
                        options={STATE_SELECT_OPTIONS}
                        placeholder="State..."
                        searchPlaceholder="Search state or code..."
                        ariaLabel="State"
                        triggerClassName="bg-white px-3.5 py-2.5"
                      />
                    </div>
                    <div className="sm:col-span-3 min-w-0">
                      <input
                        type="text"
                        autoComplete="postal-code"
                        inputMode="numeric"
                        maxLength={10}
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value.slice(0, 10))}
                        placeholder="Zip Code"
                        className="w-full min-w-0 border border-color-border-light bg-transparent px-3.5 py-2.5 text-base sm:text-sm focus:border-black focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Preferred Contact Method */}
                <div className="space-y-2 pt-1">
                  <label className="font-bold text-color-foreground uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    Preferred Contact Method
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CONTACT_METHODS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPreferredContactMethod(m.id)}
                        className={`py-2.5 px-3 border text-xs font-bold transition-all rounded-sm ${
                          preferredContactMethod === m.id
                            ? "border-black bg-black text-white shadow-sm"
                            : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-black hover:bg-white"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-5 py-3 border border-neutral-300 text-xs font-bold uppercase tracking-widest text-neutral-700 hover:border-black hover:text-black transition-colors text-center"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 bg-black text-white px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                  >
                    Continue to Legal Case Parameters
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {/* WIZARD STEP 3: LEGAL CASE PARAMETERS */}
            {!isLogin && wizardStep === 3 && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <label className="font-bold text-color-foreground uppercase tracking-widest text-[10px]">
                      Primary Legal Category
                    </label>
                    <ResponsiveSelect
                      value={legalCategory}
                      onChange={handleCategoryChange}
                      options={CATEGORY_SELECT_OPTIONS}
                      placeholder="Select category..."
                      searchPlaceholder="Filter categories..."
                      ariaLabel="Primary Legal Category"
                      triggerClassName="bg-white px-3.5 py-2.5"
                    />
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <label className="font-bold text-color-foreground uppercase tracking-widest text-[10px]">
                      Specific Sub-Category
                    </label>
                    <ResponsiveSelect
                      value={legalSubCategory}
                      onChange={setLegalSubCategory}
                      options={subCategoryOptions}
                      placeholder="Select sub-category..."
                      searchable={false}
                      ariaLabel="Specific Sub-Category"
                      triggerClassName="bg-white px-3.5 py-2.5"
                    />
                  </div>
                </div>

                {/* Case Urgency Tier */}
                <div className="space-y-2">
                  <label className="font-bold text-color-foreground uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    Case Urgency Tier
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {URGENCY_TIERS.map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setUrgency(tier.id)}
                        className={`p-3 border text-left transition-all rounded-sm ${
                          urgency === tier.id
                            ? "border-black bg-black text-white shadow-sm"
                            : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-black hover:bg-white"
                        }`}
                      >
                        <p className="text-xs font-bold">{tier.label}</p>
                        <p className={`text-[10px] mt-0.5 leading-snug ${urgency === tier.id ? "text-neutral-300" : "text-neutral-500"}`}>
                          {tier.sub}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Key Incident Date */}
                <div className="space-y-1.5">
                  <label className="font-bold text-color-foreground uppercase tracking-widest text-[10px] flex flex-wrap items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      Key Incident Date / Deadline
                    </span>
                    <span className="text-neutral-400 font-normal lowercase tracking-normal">Tracks statute of limitations</span>
                  </label>
                  <ResponsiveDatePicker
                    value={incidentDate}
                    onChange={setIncidentDate}
                    placeholder="Select incident date..."
                    ariaLabel="Key Incident Date or Deadline"
                    triggerClassName="bg-white px-3.5 py-2.5"
                  />
                </div>

                {/* Brief Case Summary */}
                <div className="space-y-1.5">
                  <label className="font-bold text-color-foreground uppercase tracking-widest text-[10px] flex justify-between">
                    <span>Brief Case Summary</span>
                    <span className="text-neutral-400 font-normal lowercase tracking-normal">{caseSummary.length}/2000 chars</span>
                  </label>
                  <textarea
                    rows={3}
                    value={caseSummary}
                    onChange={(e) => setCaseSummary(e.target.value.slice(0, 2000))}
                    placeholder="Briefly describe what happened, any upcoming court dates, and the outcome you are seeking..."
                    className="w-full min-w-0 border border-color-border-light bg-transparent p-3.5 text-base sm:text-sm focus:border-black focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="px-5 py-3 border border-neutral-300 text-xs font-bold uppercase tracking-widest text-neutral-700 hover:border-black hover:text-black transition-colors text-center"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 bg-black text-white px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                  >
                    Continue to Conflict Screening &amp; Docs
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {/* WIZARD STEP 4: PROFESSIONAL & SCREENING DETAILS */}
            {!isLogin && wizardStep === 4 && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Opposing Party Conflict Check */}
                <div className="space-y-1.5">
                  <label className="font-bold text-color-foreground uppercase tracking-widest text-[10px] flex flex-wrap items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      Opposing Party / Entity Name (Optional)
                    </span>
                    <span className="text-neutral-500 font-normal lowercase tracking-normal">Optional — conflict check if known</span>
                  </label>
                  <input
                    type="text"
                    value={opposingParty}
                    onChange={(e) => setOpposingParty(e.target.value)}
                    placeholder="Optional — e.g., Acme Corp, Insurance Co., or leave blank if unknown"
                    className="w-full min-w-0 border border-color-border-light bg-transparent px-3.5 py-2.5 text-base sm:text-sm focus:border-black focus:outline-none"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Optional. If known, attorneys screen this name against their client registry to confirm zero representation conflict before case intake. If unknown or not applicable, leave blank.
                  </p>
                </div>

                {/* Budget Expectation Range */}
                <div className="space-y-2">
                  <label className="font-bold text-color-foreground uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    Budget Expectation Range
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {BUDGET_RANGES.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBudgetRange(b.id)}
                        className={`p-3 border text-left transition-all rounded-sm ${
                          budgetRange === b.id
                            ? "border-black bg-black text-white shadow-sm"
                            : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-black hover:bg-white"
                        }`}
                      >
                        <p className="text-xs font-bold">{b.label}</p>
                        <p className={`text-[10px] mt-0.5 leading-snug ${budgetRange === b.id ? "text-neutral-300" : "text-neutral-500"}`}>
                          {b.sub}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Document Attachment Dropzone */}
                <div className="space-y-2">
                  <label className="font-bold text-color-foreground uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    Supporting Documents (Optional)
                  </label>
                  <DocumentDropzone attachments={attachments} onChange={setAttachments} compact />
                </div>

                <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="px-5 py-3.5 border border-neutral-300 text-xs font-bold uppercase tracking-widest text-neutral-700 hover:border-black hover:text-black transition-colors text-center"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-black text-white px-4 py-3.5 text-xs font-bold uppercase tracking-widest shadow-md hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating Account &amp; Dossier...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Create Account &amp; Enter Portal
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-8 pt-6 border-t border-color-border-light text-center flex flex-col gap-4">
            <button 
              type="button"
              onClick={handleToggleMode}
              suppressHydrationWarning
              className="text-sm text-color-text-muted hover:text-black transition-colors cursor-pointer select-none inline-block mx-auto"
            >
              {isLogin ? (
                <>Don&apos;t have an account? <span suppressHydrationWarning className="font-bold text-black border-b border-black hover:opacity-80 transition-opacity cursor-pointer">Sign up</span></>
              ) : (
                <>Already have an account? <span suppressHydrationWarning className="font-bold text-black border-b border-black hover:opacity-80 transition-opacity cursor-pointer">Sign in</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
