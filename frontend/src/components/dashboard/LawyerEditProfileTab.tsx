import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";
import { getServerUrl } from "@/utils/apiUrl";

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  specialty: z.string().min(2, "Specialty is required"),
  firm: z.string().optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().min(10, "Bio should be at least 10 characters long"),
  hourlyRate: z.string().regex(/^\d+$/, "Must be a valid number"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function LawyerEditProfileTab({ lawyerId }: { lawyerId: string }) {
  const { lawyerSession, loginLawyer } = useAuthStore();
  const { user } = lawyerSession;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.firmName || user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "",
      specialty: (user as any)?.specialty || "Corporate Law",
      firm: (user as any)?.firm || "",
      location: (user as any)?.location || "",
      phone: (user as any)?.phone || "",
      bio: (user as any)?.bio || "Experienced attorney.",
      hourlyRate: (user as any)?.hourlyRate || "350",
    }
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      const SERVER_URL = getServerUrl();
      const response = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/lawyers/${lawyerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update profile");
      
      const result = await response.json();
      
      // Optimistic global state update
      if (user) {
        loginLawyer({
          ...user,
          ...(data as any)
        });
      }
      
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-12 lg:p-16 max-w-5xl mx-auto w-full">
      <div className="max-w-2xl bg-white border border-color-border-light p-8 shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight mb-8 border-b border-color-border-light pb-4">Edit Public Profile</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground">Full Name</label>
              <input 
                {...register("name")}
                placeholder="e.g. Robert H. Pearson"
                className="w-full border border-color-border-light px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors" 
              />
              {errors.name && <p className="text-xs text-red-600 font-medium mt-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground">Primary Specialty</label>
              <input 
                {...register("specialty")}
                placeholder="e.g. Corporate Litigation"
                className="w-full border border-color-border-light px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors" 
              />
              {errors.specialty && <p className="text-xs text-red-600 font-medium mt-1">{errors.specialty.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground">Law Firm</label>
              <input 
                {...register("firm")}
                placeholder="e.g. Pearson & Hardman"
                className="w-full border border-color-border-light px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors" 
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground">Location</label>
              <input 
                {...register("location")}
                placeholder="e.g. New York, NY"
                className="w-full border border-color-border-light px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground">Phone Number</label>
              <input 
                {...register("phone")}
                placeholder="e.g. (555) 123-4567"
                className="w-full border border-color-border-light px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground">Hourly Rate ($)</label>
              <input 
                {...register("hourlyRate")}
                placeholder="350"
                className="w-full border border-color-border-light px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors" 
              />
              {errors.hourlyRate && <p className="text-xs text-red-600 font-medium mt-1">{errors.hourlyRate.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground">Hourly Rate ($)</label>
            <input 
              {...register("hourlyRate")}
              placeholder="350"
              className="w-full border border-color-border-light px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors" 
            />
            {errors.hourlyRate && <p className="text-xs text-red-600 font-medium mt-1">{errors.hourlyRate.message}</p>}
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground">Biography</label>
            <textarea 
              {...register("bio")}
              rows={5}
              placeholder="Tell clients about your experience..."
              className="w-full border border-color-border-light px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors resize-none" 
            />
            {errors.bio && <p className="text-xs text-red-600 font-medium mt-1">{errors.bio.message}</p>}
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-black text-white px-8 py-3 text-sm font-bold uppercase tracking-widest shadow-md hover:opacity-90 transition-minimal flex items-center justify-center min-w-[200px]"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Save Profile"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
