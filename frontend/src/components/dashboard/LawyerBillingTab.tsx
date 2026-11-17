import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { CreditCard, Crown, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getServerUrl } from "@/utils/apiUrl";

export default function LawyerBillingTab() {
  const { lawyerSession, loginLawyer } = useAuthStore();
  const { user } = lawyerSession;
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  const currentPlan = (user as any)?.plan || 'Standard Tier';

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const SERVER_URL = getServerUrl();
      const lawyerId = user?._id || user?.email || 'lwy-001';

      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/billing/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lawyerId,
          email: user?.email,
          plan: 'premium'
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create checkout session");

      if (data.url && !data.isSimulated) {
        window.location.href = data.url;
        return;
      }

      if (user) {
        loginLawyer({ ...user, plan: 'Premium Tier' } as any);
      }
      toast.success("Successfully upgraded to Premium Tier!");
    } catch (err: any) {
      toast.error(err.message || "Failed to process upgrade");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="p-6 md:p-12 lg:p-16 max-w-5xl mx-auto w-full">
      <div className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-black">Billing & Plan</h1>
        <p className="text-neutral-500 mt-1">Manage your subscription and billing details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Current Plan */}
        <div className="bg-white border border-neutral-200 p-8 shadow-sm h-full flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-yellow-100 p-3">
              <Crown className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Current Plan</p>
              <h2 className="text-2xl font-bold text-black">{currentPlan}</h2>
            </div>
          </div>
          
          <div className="flex-1 space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm">Unlimited Profile Views</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm">Client Messaging</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm">Standard Search Ranking</span>
            </div>
          </div>

          {currentPlan !== 'Premium Tier' && (
            <button 
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="w-full bg-black text-white py-4 text-sm font-bold uppercase tracking-widest shadow-md hover:bg-neutral-800 transition-colors flex justify-center items-center"
            >
              {isUpgrading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Upgrade to Premium"}
            </button>
          )}
        </div>

        {/* Payment Method */}
        <div className="bg-white border border-neutral-200 p-8 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Payment Method</h3>
          
          <div className="border border-neutral-200 p-4 flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-neutral-400" />
              </div>
              <div>
                <p className="font-bold text-sm">•••• •••• •••• 4242</p>
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-0.5">Expires 12/28</p>
              </div>
            </div>
            <span className="bg-neutral-100 text-neutral-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">Default</span>
          </div>

          <button 
            onClick={() => toast.success("Payment method update flow opened.")}
            className="text-xs font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 hover:text-neutral-500 hover:border-neutral-500 transition-colors"
          >
            Update Payment Method
          </button>
        </div>

      </div>
    </div>
  );
}
