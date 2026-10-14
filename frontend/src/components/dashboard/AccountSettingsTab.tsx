import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";

const SERVER_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

const accountSchema = z.object({
  firstName: z.string().min(2, "First name is too short"),
  lastName: z.string().min(2, "Last name is too short"),
  phone: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export default function AccountSettingsTab() {
  const { clientSession, loginClient } = useAuthStore();
  const { user } = clientSession;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      firstName: user?.firstName || (user?.name || "").split(" ")[0] || "",
      lastName: user?.lastName || (user?.name || "").split(" ").slice(1).join(" ") || "",
      phone: (user as any)?.phone || "",
    }
  });

  const onSubmit = async (data: AccountFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/users/${user.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update profile");
      
      const result = await response.json();
      
      // Optimistic global state update
      loginClient({
        ...user,
        name: `${data.firstName} ${data.lastName}`,
        ...({ phone: data.phone } as any) // Include extra fields if needed
      });
      
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
        <h2 className="text-2xl font-bold tracking-tight mb-8 border-b border-color-border-light pb-4">Account Settings</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground">First Name</label>
              <input 
                {...register("firstName")}
                className="w-full border border-color-border-light px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors" 
              />
              {errors.firstName && <p className="text-xs text-red-600 font-medium mt-1">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground">Last Name</label>
              <input 
                {...register("lastName")}
                className="w-full border border-color-border-light px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors" 
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
              className="w-full border border-color-border-light px-4 py-3 text-sm bg-neutral-50 text-neutral-500 cursor-not-allowed" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-color-foreground">Phone Number (Optional)</label>
            <input 
              {...register("phone")}
              placeholder="(555) 123-4567" 
              className="w-full border border-color-border-light px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors" 
            />
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
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
