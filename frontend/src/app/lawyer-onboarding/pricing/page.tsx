"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ShieldCheck, Star, X, ArrowLeft, Camera, Upload, Link as LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { getServerUrl } from "@/utils/apiUrl";

export default function PricingOnboardingPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState("Essential");
  const { lawyerSession, loginLawyer } = useAuthStore();
  const user = lawyerSession.user;
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Onboarding Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    firmName: "",
    specialty: "",
    bio: "",
    hourlyRate: "",
    location: "",
    imageUrl: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tiers = [
    {
      name: "Essential",
      price: "$0",
      description: "Basic visibility in the directory.",
      features: ["Standard listing", "Receive direct messages", "Basic analytics"],
      highlight: false,
      buttonText: "Start Free",
    },
    {
      name: "Premium",
      price: "$199",
      period: "/month",
      description: "Maximum visibility and premium tools.",
      features: ["Featured placement", "Unlimited consultations", "Advanced analytics", "Priority support", "Verified badge"],
      highlight: true,
      buttonText: "Claim Premium Profile",
    }
  ];

  const handleClaim = (tier: string) => {
    setSelectedTier(tier);
    setShowModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lawyerId = user?._id || user?.email;
    if (!lawyerId) return toast.error("User session not found.");

    setIsSubmitting(true);
    try {
      const SERVER_URL = getServerUrl();
      const planName = selectedTier === 'Premium' ? 'Premium Tier' : 'Essential Tier';

      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/lawyers/${lawyerId}/onboard`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          plan: planName
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");

      // Update Zustand
      loginLawyer({ ...data.user, plan: planName });
      
      toast.success("Profile Activated!", { description: "Taking you to your dashboard..." });
      setShowModal(false);
      router.push("/attorney-dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-color-background flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-black/5 rounded-full blur-3xl -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl mb-16"
      >
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-black text-white mb-6">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-color-foreground mb-4">
          Choose Your Plan
        </h1>
        <p className="text-lg text-color-text-muted">
          Join thousands of top-tier attorneys. Enhance your digital footprint, receive direct client inquiries, and manage your practice seamlessly.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl z-10">
        {tiers.map((tier, idx) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15 }}
            className={`relative flex flex-col p-8 sm:p-10 border ${
              tier.highlight 
                ? "border-black shadow-2xl bg-white scale-100 md:scale-105 z-10" 
                : "border-color-border-light bg-neutral-50"
            }`}
          >
            {tier.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-1 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                <Star className="h-3 w-3 fill-white" /> Recommended
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-xl font-bold text-color-foreground mb-2">{tier.name}</h3>
              <p className="text-sm text-color-text-muted h-10">{tier.description}</p>
            </div>
            
            <div className="mb-8 flex items-baseline text-5xl font-extrabold text-color-foreground tracking-tight">
              {tier.price}
              {tier.period && <span className="text-lg font-medium text-color-text-muted ml-1">{tier.period}</span>}
            </div>
            
            <ul className="mb-10 space-y-4 flex-1">
              {tier.features.map(feat => (
                <li key={feat} className="flex items-start">
                  <Check className={`h-5 w-5 shrink-0 mr-3 ${tier.highlight ? "text-black" : "text-neutral-400"}`} />
                  <span className="text-sm font-medium text-color-foreground">{feat}</span>
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => handleClaim(tier.name)}
              className={`w-full py-4 px-6 font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 group
                ${tier.highlight 
                  ? "bg-black text-white hover:bg-neutral-800" 
                  : "bg-white border-2 border-black text-black hover:bg-neutral-50"
                }
              `}
            >
              {tier.buttonText}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Onboarding Modal Overlay */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8 flex justify-center"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl shadow-2xl relative h-fit mt-8 sm:mt-16 mb-16 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-color-border-light bg-neutral-50 relative">
                <div className="w-10">
                  {currentStep > 1 && (
                    <button 
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="p-2 -ml-2 text-neutral-500 hover:text-black transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <h2 className="text-xl font-bold text-color-foreground text-center">
                  {currentStep === 1 ? "Basic Information" : currentStep === 2 ? "Practice & Rates" : "Professional Bio"}
                </h2>
                <div className="w-10 flex justify-end">
                  <button 
                    onClick={() => { setShowModal(false); setCurrentStep(1); }}
                    className="p-2 -mr-2 text-neutral-500 hover:text-black transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1 bg-neutral-200">
                <motion.div 
                  className="h-full bg-black"
                  initial={{ width: "33%" }}
                  animate={{ width: `${(currentStep / 3) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Form Body */}
              <div className="p-8 sm:p-10">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-color-text-muted">First Name</label>
                          <input required name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full border border-color-border-light bg-transparent px-4 py-3 text-sm focus:border-black focus:outline-none" placeholder="Robert" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-color-text-muted">Last Name</label>
                          <input required name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full border border-color-border-light bg-transparent px-4 py-3 text-sm focus:border-black focus:outline-none" placeholder="Pearson" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-color-text-muted">Firm Name</label>
                        <input required name="firmName" value={formData.firmName} onChange={handleInputChange} className="w-full border border-color-border-light bg-transparent px-4 py-3 text-sm focus:border-black focus:outline-none" placeholder="Pearson & Hardman LLP" />
                      </div>
                      <div className="space-y-3 pt-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-color-text-muted flex items-center justify-between">
                          <span>Profile Photo <span className="text-neutral-400 normal-case font-normal">(Optional)</span></span>
                        </label>
                        
                        {/* Hidden Inputs */}
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <input type="file" accept="image/*" capture="user" ref={cameraInputRef} onChange={handleFileUpload} className="hidden" />

                        {formData.imageUrl && formData.imageUrl.startsWith('data:image') ? (
                          <div className="relative w-24 h-24 mb-4 rounded-full overflow-hidden border-2 border-black">
                            <img src={formData.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                            <button 
                              type="button" 
                              onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                              className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
                            >
                              <X className="w-6 h-6" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                              <LinkIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                              <input name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} className="w-full border border-color-border-light bg-transparent px-4 py-2.5 text-sm focus:border-black focus:outline-none" placeholder="Paste image URL here..." />
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="h-px bg-color-border-light flex-1"></div>
                              <span className="text-[10px] uppercase text-neutral-400 font-bold">OR</span>
                              <div className="h-px bg-color-border-light flex-1"></div>
                            </div>

                            <div className="flex gap-3">
                              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 border border-color-border-light bg-neutral-50 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-100 transition-colors text-color-foreground">
                                <Upload className="w-4 h-4" /> Upload
                              </button>
                              <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 border border-color-border-light bg-neutral-50 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-neutral-100 transition-colors text-color-foreground">
                                <Camera className="w-4 h-4" /> Camera
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-color-text-muted">Specialty</label>
                          <select required name="specialty" value={formData.specialty} onChange={handleInputChange} className="w-full border border-color-border-light bg-transparent px-4 py-3 text-sm focus:border-black focus:outline-none">
                            <option value="" disabled>Select Specialty</option>
                            <option value="Corporate Litigation">Corporate Litigation</option>
                            <option value="Family Law">Family Law</option>
                            <option value="Criminal Defense">Criminal Defense</option>
                            <option value="Intellectual Property">Intellectual Property</option>
                            <option value="Real Estate Law">Real Estate Law</option>
                            <option value="General Practice">General Practice</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-color-text-muted">Hourly Rate ($)</label>
                          <input required type="number" name="hourlyRate" value={formData.hourlyRate} onChange={handleInputChange} className="w-full border border-color-border-light bg-transparent px-4 py-3 text-sm focus:border-black focus:outline-none" placeholder="350" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-color-text-muted">Office Location</label>
                        <input required name="location" value={formData.location} onChange={handleInputChange} className="w-full border border-color-border-light bg-transparent px-4 py-3 text-sm focus:border-black focus:outline-none" placeholder="New York, NY" />
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div 
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-color-text-muted">Professional Bio</label>
                        <textarea required name="bio" value={formData.bio} onChange={handleInputChange} rows={6} className="w-full border border-color-border-light bg-transparent px-4 py-3 text-sm focus:border-black focus:outline-none resize-none" placeholder="Detail your experience and track record..."></textarea>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-8 pt-6 border-t border-color-border-light">
                  {currentStep < 3 ? (
                    <button 
                      type="button"
                      onClick={() => {
                        if (currentStep === 1 && (!formData.firstName || !formData.lastName || !formData.firmName)) {
                          toast.error("Please fill out all required fields.");
                          return;
                        }
                        if (currentStep === 2 && (!formData.specialty || !formData.hourlyRate || !formData.location)) {
                          toast.error("Please fill out all required fields.");
                          return;
                        }
                        setCurrentStep(prev => prev + 1);
                      }}
                      className="w-full bg-black text-white py-4 text-sm font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                    >
                      Continue <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={handleSubmit}
                      disabled={isSubmitting || !formData.bio}
                      className="w-full bg-black text-white py-4 text-sm font-bold uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? "Activating Profile..." : "Complete Setup & Enter Dashboard"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
