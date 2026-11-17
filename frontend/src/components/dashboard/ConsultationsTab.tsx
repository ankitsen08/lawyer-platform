import { useEffect, useState } from "react";
import { Calendar, Video, Phone, Building2, ShieldCheck } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { toast } from "sonner";
import { getServerUrl } from "@/utils/apiUrl";

interface Consultation {
  id: string;
  clientId: string;
  lawyerId: string;
  lawyerName: string;
  topic: string;
  date: string;
  time: string;
  zoomLink: string;
  format?: "zoom" | "phone" | "in_person";
  opposingParty?: string;
  urgency?: string;
  status: "upcoming" | "completed";
}

export default function ConsultationsTab({ userId, setActiveTab }: { userId: string, setActiveTab: (tab: string) => void }) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setActiveContactId } = useChatStore();

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const SERVER_URL = getServerUrl();
        const response = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/consultations/${userId}`, {
          credentials: 'include'
        });
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Upcoming Consultations</h2>
          <span className="text-xs font-semibold bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded">
            {upcoming.length} Scheduled
          </span>
        </div>
        
        {upcoming.length === 0 ? (
          <div className="text-center py-12 border border-color-border-light bg-neutral-50 rounded-sm">
            <p className="text-color-text-muted text-sm">You have no upcoming consultations scheduled.</p>
          </div>
        ) : (
          upcoming.map((consultation) => {
            const format = consultation.format || "zoom";
            return (
              <div key={consultation.id} className="border-l-4 border-black bg-white p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-4 rounded-r-sm border border-gray-100">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded">
                      {consultation.topic}
                    </span>
                    {consultation.opposingParty && (
                      <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-green-600" />
                        Conflict Checked: {consultation.opposingParty}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold">{consultation.lawyerName}</h3>
                  
                  <div className="flex items-center gap-4 text-sm font-medium text-color-foreground flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-neutral-500" />
                      <span>{consultation.date}, {consultation.time}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-neutral-600 text-xs">
                      {format === "zoom" && <Video className="w-3.5 h-3.5 text-blue-600" />}
                      {format === "phone" && <Phone className="w-3.5 h-3.5 text-green-600" />}
                      {format === "in_person" && <Building2 className="w-3.5 h-3.5 text-purple-600" />}
                      <span className="capitalize">{format.replace('_', ' ')} format</span>
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-auto flex flex-col gap-2">
                  {format === "zoom" ? (
                    <a 
                      href={consultation.zoomLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto bg-black text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-neutral-800 transition-colors text-center inline-flex items-center justify-center gap-2 rounded-sm"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Join Video Room
                    </a>
                  ) : format === "phone" ? (
                    <div className="px-5 py-2.5 bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-bold uppercase tracking-wider text-center rounded-sm flex items-center justify-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-green-600" />
                      Phone Call Consultation
                    </div>
                  ) : (
                    <div className="px-5 py-2.5 bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-bold uppercase tracking-wider text-center rounded-sm flex items-center justify-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-purple-600" />
                      In-Person Consultation
                    </div>
                  )}

                  <button
                    onClick={() => handleMessageAgain(consultation.lawyerId)}
                    className="text-xs font-semibold text-neutral-600 hover:text-black transition-colors text-center py-1"
                  >
                    Direct Message Lawyer
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6">Past Consultations</h2>
        {completed.length === 0 ? (
          <p className="text-sm text-color-text-muted">No past consultations.</p>
        ) : (
          completed.map((consultation) => (
            <div key={consultation.id} className="border border-color-border-light bg-neutral-50 p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 opacity-70 mb-4 rounded-sm">
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
                className="w-full sm:w-auto border border-black bg-transparent text-black px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors rounded-sm"
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
