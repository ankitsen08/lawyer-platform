import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { toast } from "sonner";

const SERVER_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface Consultation {
  id: string;
  clientId: string;
  lawyerId: string;
  lawyerName: string;
  topic: string;
  date: string;
  time: string;
  zoomLink: string;
  status: "upcoming" | "completed";
}

export default function ConsultationsTab({ userId, setActiveTab }: { userId: string, setActiveTab: (tab: string) => void }) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setActiveContactId } = useChatStore();

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const response = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/consultations/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setConsultations(data);
      } catch (error) {
        toast.error("Failed to load consultations");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    if (userId) fetchConsultations();
  }, [userId]);

  const handleMessageAgain = (lawyerId: string) => {
    setActiveContactId(lawyerId);
    setActiveTab("messages");
  };

  const upcoming = consultations.filter(c => c.status === "upcoming");
  const completed = consultations.filter(c => c.status === "completed");

  if (isLoading) return <div className="p-16 text-center text-sm font-bold text-color-text-muted">Loading consultations...</div>;

  return (
    <div className="p-6 md:p-12 lg:p-16 max-w-5xl mx-auto w-full space-y-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6">Upcoming Consultations</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-color-text-muted">No upcoming consultations.</p>
        ) : (
          upcoming.map((consultation) => (
            <div key={consultation.id} className="border-l-4 border-black bg-white p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-color-text-muted mb-1">{consultation.topic}</p>
                <h3 className="text-xl font-bold">{consultation.lawyerName}</h3>
                <div className="flex items-center gap-4 mt-3 text-sm font-medium">
                  <div className="flex items-center gap-1 text-color-foreground">
                    <Calendar className="w-4 h-4" /> {consultation.date}, {consultation.time}
                  </div>
                </div>
              </div>
              <a 
                href={consultation.zoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 text-sm font-bold shadow-md hover:bg-blue-700 transition-colors text-center inline-block"
              >
                Join Zoom Meeting
              </a>
            </div>
          ))
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6">Past Consultations</h2>
        {completed.length === 0 ? (
          <p className="text-sm text-color-text-muted">No past consultations.</p>
        ) : (
          completed.map((consultation) => (
            <div key={consultation.id} className="border border-color-border-light bg-neutral-50 p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 opacity-70 mb-4">
              <div>
                <h3 className="text-lg font-bold">{consultation.lawyerName}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-1 text-color-text-muted">
                    <Calendar className="w-4 h-4" /> {consultation.date}
                  </div>
                  <span className="bg-neutral-200 text-neutral-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">Completed</span>
                </div>
              </div>
              <button 
                onClick={() => handleMessageAgain(consultation.lawyerId)}
                className="w-full sm:w-auto border border-black bg-transparent text-black px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
              >
                Message Again
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
