import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";

const SERVER_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface Stats {
  views: string;
  viewsTrend: string;
  leads: string;
  leadsTrend: string;
  ranking: string;
  rankingTrend: string;
}

export default function LawyerOverviewTab({ lawyerId, setActiveTab }: { lawyerId: string, setActiveTab?: (tab: string) => void }) {
  const { lawyerSession } = useAuthStore();
  const { user } = lawyerSession;
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/lawyers/${lawyerId}/stats`);
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [lawyerId]);

  if (isLoading || !stats) {
    return <div className="p-16 text-center text-sm font-bold text-color-text-muted">Loading overview...</div>;
  }

  const metrics = [
    { label: "Profile Views (30 Days)", value: stats.views, trend: stats.viewsTrend, positive: stats.viewsTrend.startsWith('+') },
    { label: "Leads Generated", value: stats.leads, trend: stats.leadsTrend, positive: stats.leadsTrend.startsWith('+') },
    { label: "Search Ranking", value: stats.ranking, trend: stats.rankingTrend, positive: stats.rankingTrend.startsWith('+') }
  ];

  return (
    <div className="p-6 md:p-12 lg:p-16 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Dashboard Overview</h1>
          <p className="text-neutral-500 mt-1">Welcome back, {user?.firstName || (user?.name || "").split(' ')[0] || user?.firmName?.split(' ')[0] || 'Attorney'}. Here is how your profile is performing.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white border border-neutral-200 p-2 shadow-sm">
          <div className="bg-yellow-100 p-2">
            <Crown className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="pr-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Current Plan</p>
            <p className="text-sm font-bold text-black">{(user as any)?.plan || 'Standard Tier'}</p>
          </div>
          <button 
            onClick={() => setActiveTab && setActiveTab("billing")}
            className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
          >
            Upgrade
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {metrics.map((stat, idx) => (
          <div key={idx} className="bg-white border border-neutral-200 p-6 shadow-sm relative overflow-hidden group hover:border-black transition-colors">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">{stat.label}</p>
            <div className="flex items-baseline gap-3">
              <h3 className="text-4xl font-black text-black tracking-tight">{stat.value}</h3>
              <span className={`text-sm font-bold ${stat.positive ? "text-green-600" : "text-red-600"}`}>
                {stat.trend}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-neutral-100">
              <div className="h-full bg-black w-2/3 group-hover:w-full transition-all duration-500"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Required / Next Steps */}
      <div className="bg-white border border-neutral-200 p-8 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight text-black mb-6">Optimize Your Profile</h2>
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-neutral-200 gap-4">
            <div>
              <h4 className="font-bold text-black">Add Verified Case Results</h4>
              <p className="text-sm text-neutral-500 mt-1">Profiles with case results convert 40% more leads. You currently have 3 results listed.</p>
            </div>
            <button 
              onClick={() => setActiveTab && setActiveTab("profile")}
              className="whitespace-nowrap border-2 border-black px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
            >
              Add Result
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-neutral-200 gap-4 bg-neutral-50">
            <div>
              <h4 className="font-bold text-black flex items-center gap-2">
                Answer Legal Questions <span className="bg-black text-white text-[10px] px-2 py-0.5 uppercase tracking-widest">High Impact</span>
              </h4>
              <p className="text-sm text-neutral-500 mt-1">There are 14 unanswered questions in Corporate Litigation in NY. Answer them to boost your SEO.</p>
            </div>
            <Link 
              href="/legal-answers"
              className="inline-block whitespace-nowrap border-2 border-black bg-black text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors text-center"
            >
              View Q&A
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
