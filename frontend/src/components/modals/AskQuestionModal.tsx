import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthStore } from "@/store/useAuthStore";
import { getServerUrl } from "@/utils/apiUrl";

interface AskQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const questionSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters long").max(120, "Title cannot exceed 120 characters"),
  category: z.string().min(1, "Please select a practice area"),
  location: z.string().min(3, "Please provide a valid city and state"),
  content: z.string().min(30, "Please provide more details (at least 30 characters)").max(2000, "Details cannot exceed 2000 characters")
});

type QuestionFormValues = z.infer<typeof questionSchema>;

export default function AskQuestionModal({ isOpen, onClose, onSuccess }: AskQuestionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { clientSession } = useAuthStore();

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      title: "",
      category: "",
      location: "",
      content: ""
    }
  });

  const contentValue = watch("content") || "";

  if (!isOpen) return null;

  const onSubmit = async (data: QuestionFormValues) => {
    setIsSubmitting(true);
    try {
      const SERVER_URL = getServerUrl();
      const user = clientSession.user;

      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/qa/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: user?._id || user?.email || "anonymous",
          clientName: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "Verified Client",
          title: data.title,
          category: data.category,
          location: data.location,
          content: data.content
        })
      });

      if (!res.ok) {
        throw new Error("Failed to post question");
      }

      toast.success("Question Posted!", {
        description: "Your question is now live for verified attorneys to answer."
      });
      reset();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Failed to post question. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white border border-neutral-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-200 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-black">Ask a Legal Question</h2>
            <p className="text-xs text-neutral-500 mt-1">Free & anonymous guidance from verified attorneys.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Question Title</label>
              <input 
                type="text"
                {...register("title")}
                placeholder="E.g., Can my landlord evict me with only 3 days' notice?"
                className={`w-full border ${errors.title ? 'border-red-500' : 'border-neutral-300'} px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors`} 
              />
              {errors.title && <p className="text-xs text-red-600 font-medium mt-1">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Practice Area</label>
                <select 
                  {...register("category")}
                  className={`w-full border ${errors.category ? 'border-red-500' : 'border-neutral-300'} px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors bg-white`}
                >
                  <option value="" disabled>Select a category...</option>
                  <option value="Employment Law">Employment Law</option>
                  <option value="Divorce & Separation">Divorce & Separation</option>
                  <option value="Child Custody">Child Custody</option>
                  <option value="DUI & DWI">DUI & DWI</option>
                  <option value="Car Accidents">Car Accidents</option>
                  <option value="Real Estate Law">Real Estate Law</option>
                  <option value="Intellectual Property">Intellectual Property</option>
                  <option value="Corporate Law">Corporate Law</option>
                  <option value="Criminal Defense">Criminal Defense</option>
                  <option value="Personal Injury">Personal Injury</option>
                </select>
                {errors.category && <p className="text-xs text-red-600 font-medium mt-1">{errors.category.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Location (City, State)</label>
                <input 
                  type="text"
                  {...register("location")}
                  placeholder="E.g., Manhattan, NY"
                  className={`w-full border ${errors.location ? 'border-red-500' : 'border-neutral-300'} px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors`} 
                />
                {errors.location && <p className="text-xs text-red-600 font-medium mt-1">{errors.location.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Case Details</label>
                <span className={`text-[10px] ${contentValue.length < 30 ? 'text-amber-600 font-bold' : 'text-neutral-400'}`}>
                  {contentValue.length}/2000 chars (min. 30)
                </span>
              </div>
              <textarea 
                rows={5}
                {...register("content")}
                placeholder="Describe your situation in detail without including sensitive confidential identifiers..."
                className={`w-full border ${errors.content ? 'border-red-500' : 'border-neutral-300'} p-4 text-sm focus:outline-none focus:border-black transition-colors`} 
              />
              {errors.content && <p className="text-xs text-red-600 font-medium mt-1">{errors.content.message}</p>}
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-black transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="bg-black text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Post Question"
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
