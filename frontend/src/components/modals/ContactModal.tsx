"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Loader2, CheckCircle2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useContactStore } from "@/store/useContactStore";

const contactSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().regex(
    /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
    "Please enter a valid 10-digit US phone number"
  ),
  issue: z.string().min(1, "Please select a legal issue category"),
  description: z.string().min(15, "Please provide at least a short sentence describing your case"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function ContactModal() {
  const { isOpen, lawyerName, lawyerId, closeContactModal } = useContactStore();
  const [formState, setFormState] = useState<"idle" | "submitting" | "success">("idle");
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      issue: "",
      description: "",
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormState("idle");
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: ContactFormValues) => {
    setFormState("submitting");
    
    try {
      const SERVER_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lawyerId: lawyerId || 'general',
          lawyerName: lawyerName || 'Directory Administration',
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          issue: data.issue,
          description: data.description
        })
      });

      if (!res.ok) {
        throw new Error("Failed to deliver message");
      }

      setFormState("success");
      toast.success(`Message sent securely to ${lawyerName || 'attorney'}.`, {
        description: "They will review your case details and reply shortly.",
      });

      // Auto-close after success
      setTimeout(() => {
        closeContactModal();
      }, 2500);
    } catch (err) {
      console.error(err);
      toast.error("Failed to deliver inquiry. Please try again.");
      setFormState("idle");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 bg-white">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            Contact {lawyerName}
          </h2>
          <button 
            onClick={closeContactModal}
            className="text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {formState === "success" ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in">
              <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Message Sent</h3>
              <p className="text-gray-600">
                Your details have been securely delivered to {lawyerName}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-900">Full Name</label>
                <input 
                  type="text"
                  {...register("fullName")}
                  className={`w-full bg-gray-50 border ${errors.fullName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-black focus:ring-black'} text-gray-900 px-4 py-3 text-sm focus:bg-white focus:ring-1 outline-none transition-all rounded-lg`}
                  placeholder="John Doe"
                />
                {errors.fullName && <p className="text-xs text-red-500 font-medium">{errors.fullName.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-900">Email</label>
                  <input 
                    type="email"
                    {...register("email")}
                    className={`w-full bg-gray-50 border ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-black focus:ring-black'} text-gray-900 px-4 py-3 text-sm focus:bg-white focus:ring-1 outline-none transition-all rounded-lg`}
                    placeholder="john@example.com"
                  />
                  {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-900">Phone Number</label>
                  <input 
                    type="tel"
                    {...register("phone")}
                    className={`w-full bg-gray-50 border ${errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-black focus:ring-black'} text-gray-900 px-4 py-3 text-sm focus:bg-white focus:ring-1 outline-none transition-all rounded-lg`}
                    placeholder="(555) 000-0000"
                  />
                  {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-sm font-semibold text-gray-900">Legal Issue</label>
                
                {/* Hidden actual input for react-hook-form */}
                <input type="hidden" {...register("issue")} />
                
                {/* Custom Select Trigger */}
                <button
                  type="button"
                  onClick={() => setIsSelectOpen(!isSelectOpen)}
                  className={`flex items-center justify-between w-full bg-gray-50 border ${errors.issue ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-black focus:ring-black'} text-gray-900 px-4 py-3 text-sm focus:bg-white focus:ring-1 outline-none transition-all rounded-lg text-left`}
                >
                  <span className={watch("issue") ? "text-gray-900" : "text-gray-500"}>
                    {watch("issue") || "Select a category..."}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isSelectOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Custom Select Dropdown */}
                {isSelectOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {[
                      "Personal Injury",
                      "Family Law",
                      "Criminal Defense",
                      "Business Law / Corporate",
                      "Real Estate",
                      "Other / Not Sure"
                    ].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setValue("issue", cat, { shouldValidate: true });
                          setIsSelectOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                
                {errors.issue && <p className="text-xs text-red-500 font-medium">{errors.issue.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-900">Brief Description</label>
                <textarea 
                  {...register("description")}
                  rows={4}
                  className={`w-full bg-gray-50 border ${errors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-black focus:ring-black'} text-gray-900 px-4 py-3 text-sm focus:bg-white focus:ring-1 outline-none transition-all resize-none rounded-lg`}
                  placeholder="Please provide a brief summary of your situation..."
                />
                {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={formState === "submitting"}
                  className="flex items-center justify-center gap-2 bg-black text-white w-full py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {formState === "submitting" ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Submitting Securely...
                    </>
                  ) : (
                    "Send Secure Message"
                  )}
                </button>
                <p className="text-center text-xs text-gray-500 mt-4">
                  Information submitted is confidential and encrypted.
                </p>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
