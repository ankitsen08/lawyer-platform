"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2, MapPin, MessageSquare, BellRing } from "lucide-react";
import { getServerUrl } from "@/utils/apiUrl";
import { CONTACT_METHODS, STATE_SELECT_OPTIONS, formatPhoneMask, normalizeContactMethodClient } from "@/utils/legalData";
import ResponsiveSelect from "@/components/shared/ResponsiveSelect";

const accountSchema = z.object({
  firstName: z.string().trim().min(2, "First name is too short").max(50, "First name cannot exceed 50 characters"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name cannot exceed 50 characters"),
  phone: z.string()
    .trim()
    .refine((val) => !val || /^[+()0-9\s.-]{7,25}$/.test(val), {
      message: "Please enter a valid phone number (e.g. (555) 123-4567)"
    })
    .optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(40).optional(),
  zipCode: z.string().trim().max(10).optional(),
  preferredContactMethod: z.enum(["email", "phone", "sms", "whatsapp"]),
  smsConsent: z.boolean()
});

type AccountFormValues = z.infer<typeof accountSchema>;

export default function AccountSettingsTab() {
  const { clientSession, loginClient } = useAuthStore();
  const { user } = clientSession;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      firstName: user?.firstName || (user?.name || "").split(" ")[0] || "",
      lastName: user?.lastName || (user?.name || "").split(" ").slice(1).join(" ") || "",
      phone: user?.phone || "",
      city: user?.city || user?.caseProfile?.city || "",
      state: user?.state || user?.caseProfile?.state || "",
      zipCode: user?.zipCode || user?.caseProfile?.zipCode || "",
      preferredContactMethod: normalizeContactMethodClient(user?.preferredContactMethod || user?.caseProfile?.preferredContactMethod),
      smsConsent: user?.smsConsent ?? user?.caseProfile?.smsNotifications ?? false
    }
  });

  const phoneVal = watch("phone") || "";
  const stateVal = watch("state") || "";
  const selectedContactMethod = watch("preferredContactMethod");
  const smsConsentVal = watch("smsConsent");

  const onSubmit = async (data: AccountFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const SERVER_URL = getServerUrl();
      const response = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/users/${user.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) throw new Error("Failed to update profile");
      
      const result = await response.json();
      const updatedUser = result.user || {};

      loginClient({
        ...user,
        ...updatedUser,
        name: updatedUser.name || `${data.firstName} ${data.lastName}`.trim(),
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        preferredContactMethod: data.preferredContactMethod,
        smsConsent: data.smsConsent
      });
      
      toast.success("Account settings & location updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-12 lg:p-16 max-w-5xl mx-auto w-full min-w-0">
      <div className="max-w-2xl bg-white border border-color-border-light p-5 sm:p-8 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-6 sm:mb-8 border-b border-color-border-light pb-4">Account &amp; Contact Settings</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-1 min-w-0">
              <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground">First Name</label>
              <input 
                autoComplete="given-name"
                {...register("firstName")}
                className="w-full min-w-0 border border-color-border-light px-3.5 sm:px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-black transition-colors" 
              />
              {errors.firstName && <p className="text-xs text-red-600 font-medium mt-1">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1 min-w-0">
              <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground">Last Name</label>
              <input 
                autoComplete="family-name"
                {...register("lastName")}
                className="w-full min-w-0 border border-color-border-light px-3.5 sm:px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-black transition-colors" 
              />
              {errors.lastName && <p className="text-xs text-red-600 font-medium mt-1">{errors.lastName.message}</p>}
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground opacity-50">Email Address (Read-Only)</label>
            <input 
              type="email" 
              value={user?.email || ""} 
              disabled
              className="w-full min-w-0 border border-color-border-light px-3.5 sm:px-4 py-3 text-base sm:text-sm bg-neutral-50 text-neutral-500 cursor-not-allowed" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground">Phone Number</label>
            <input 
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phoneVal}
              onChange={(e) => setValue("phone", formatPhoneMask(e.target.value))}
              placeholder="(555) 123-4567" 
              className="w-full min-w-0 border border-color-border-light px-3.5 sm:px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-black transition-colors" 
            />
            {errors.phone && <p className="text-xs text-red-600 font-medium mt-1">{errors.phone.message}</p>}

            <label className="flex items-start sm:items-center gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={smsConsentVal}
                onChange={(e) => setValue("smsConsent", e.target.checked)}
                className="mt-0.5 sm:mt-0 w-4 h-4 shrink-0 text-black focus:ring-black border-gray-300 rounded"
              />
              <span className="text-xs text-neutral-700 flex items-start sm:items-center gap-1.5 leading-snug">
                <BellRing className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5 sm:mt-0" />
                Enable SMS notification consent for appointment reminders &amp; messages
              </span>
            </label>
          </div>

          {/* City, State, Zip */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              Location (City, State &amp; Zip Code)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5 min-w-0">
                <input
                  autoComplete="address-level2"
                  {...register("city")}
                  placeholder="City"
                  className="w-full min-w-0 border border-color-border-light px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-black"
                />
              </div>
              <div className="sm:col-span-4 min-w-0">
                <ResponsiveSelect
                  value={stateVal}
                  onChange={(val) => setValue("state", val, { shouldDirty: true })}
                  options={STATE_SELECT_OPTIONS}
                  placeholder="State..."
                  searchPlaceholder="Search state or code..."
                  ariaLabel="State"
                  triggerClassName="bg-white px-3.5 py-2.5"
                />
              </div>
              <div className="sm:col-span-3 min-w-0">
                <input
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={10}
                  {...register("zipCode")}
                  placeholder="Zip Code"
                  className="w-full min-w-0 border border-color-border-light px-3.5 py-2.5 text-base sm:text-sm focus:outline-none focus:border-black"
                />
              </div>
            </div>
          </div>

          {/* Preferred Contact Method */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              Preferred Contact Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CONTACT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setValue("preferredContactMethod", m.id)}
                  className={`py-2.5 px-3 border text-xs font-bold transition-all ${
                    selectedContactMethod === m.id
                      ? "bg-black text-white border-black"
                      : "bg-neutral-50 text-neutral-700 border-color-border-light hover:border-black hover:bg-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sm:w-auto sm:min-w-[200px] bg-black text-white px-8 py-3 text-sm font-bold uppercase tracking-widest shadow-md hover:opacity-90 transition-minimal flex items-center justify-center"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
