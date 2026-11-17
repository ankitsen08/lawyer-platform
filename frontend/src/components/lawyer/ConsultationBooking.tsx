"use client";

import { useState, useMemo } from "react";
import { Calendar, Clock, CheckCircle2, Video, Phone, Building2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { getServerUrl } from "@/utils/apiUrl";

interface ConsultationBookingProps {
  lawyerId?: string;
  lawyerName: string;
  consultationFee: number; // 0 for Free
}

type MeetingFormat = "zoom" | "phone" | "in_person";

export default function ConsultationBooking({ lawyerId, lawyerName, consultationFee }: ConsultationBookingProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [format, setFormat] = useState<MeetingFormat>("zoom");
  const [opposingParty, setOpposingParty] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const { clientSession } = useAuthStore();
  const router = useRouter();

  // Generate real dynamic schedule based on current system date
  const schedule = useMemo(() => {
    const days = [];
    const today = new Date();

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);

      let label = "";
      if (i === 0) label = "Today";
      else if (i === 1) label = "Tomorrow";
      else label = dayNames[d.getDay()];

      const fullDate = `${monthNames[d.getMonth()]} ${d.getDate()}`;
      const isoDate = d.toISOString().split("T")[0];

      days.push({
        label,
        fullDate,
        isoDate,
        slots: ["09:30 AM", "11:00 AM", "02:00 PM", "04:30 PM"]
      });
    }

    return days;
  }, []);

  const selectedDate = schedule[selectedDayIdx];

  const handleConfirm = async () => {
    if (!selectedTime) return;

    if (!clientSession.isAuthenticated || !clientSession.user) {
      toast.error("Sign in required", {
        description: "Please sign in to your client account to book a consultation."
      });
      router.push("/client-login");
      return;
    }

    setIsBooking(true);
    
    try {
      const SERVER_URL = getServerUrl();
      const user = clientSession.user;

      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/consultations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: user._id || user.email,
          clientName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Client',
          clientEmail: user.email,
          clientPhone: user.phone || '',
          city: user.city || user.caseProfile?.city || '',
          state: user.state || user.caseProfile?.state || '',
          zipCode: user.zipCode || user.caseProfile?.zipCode || '',
          preferredContactMethod: user.preferredContactMethod || user.caseProfile?.preferredContactMethod || 'email',
          smsConsent: user.smsConsent ?? user.caseProfile?.smsNotifications ?? false,
          lawyerId: lawyerId || 'lwy-001',
          lawyerName: lawyerName,
          date: `${selectedDate.label}, ${selectedDate.fullDate}`,
          time: selectedTime,
          topic: `Initial Legal Consultation (${format.toUpperCase()})`,
          consultationFee: consultationFee,
          format,
          legalCategory: user.caseProfile?.legalCategory || 'General Legal Consultation',
          legalSubCategory: user.caseProfile?.legalSubCategory || '',
          incidentDate: user.caseProfile?.incidentDate || '',
          budgetRange: user.caseProfile?.budgetRange || 'contingency',
          caseSummary: user.caseProfile?.notes || '',
          opposingParty: opposingParty.trim() || user.caseProfile?.opposingParty || '',
          urgency: selectedDayIdx === 0 ? "immediate" : (user.caseProfile?.urgency || "this_week")
        })
      });

      if (!res.ok) {
        throw new Error("Failed to book consultation");
      }

      const data = await res.json();

      toast.success("Consultation Confirmed!", {
        description: `Your ${format.replace('_', ' ')} appointment with ${lawyerName} is confirmed for ${selectedDate.label} (${selectedDate.fullDate}) at ${selectedTime}.`,
        action: data.googleCalendarUrl ? {
          label: "Add to Calendar",
          onClick: () => window.open(data.googleCalendarUrl, '_blank')
        } : undefined
      });
      setSelectedTime(null);
      setOpposingParty("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to confirm booking. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  const feeText = consultationFee === 0 ? "Free Consultation" : `$${consultationFee}`;

  return (
    <div className="border border-color-border-light bg-white p-6 shadow-sm flex flex-col space-y-5 rounded-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-color-border-light pb-4">
        <div>
          <h3 className="font-bold tracking-tight text-xl text-color-foreground">
            Book Consultation
          </h3>
          <p className="text-xs text-color-text-muted mt-0.5">Select your preferred date, time, and meeting format.</p>
        </div>
        <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 uppercase tracking-wide rounded">
          {feeText}
        </span>
      </div>

      {/* Meeting Format Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-color-foreground">
          Meeting Format
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "zoom" as MeetingFormat, label: "Zoom Video", icon: Video },
            { id: "phone" as MeetingFormat, label: "Phone Call", icon: Phone },
            { id: "in_person" as MeetingFormat, label: "In-Person", icon: Building2 },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = format === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFormat(item.id)}
                className={`flex flex-col items-center justify-center p-2.5 border transition-all text-xs font-semibold rounded-sm ${
                  isSelected
                    ? "border-black bg-black text-white shadow-sm"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400 hover:bg-white"
                }`}
              >
                <Icon className="h-4 w-4 mb-1" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Selection */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-color-foreground flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-gray-500" />
          Select Date
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {schedule.map((day, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedDayIdx(idx);
                setSelectedTime(null); // Reset time on date change
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-1 border transition-all rounded-sm ${
                selectedDayIdx === idx
                  ? "border-black bg-black text-white shadow-md font-bold"
                  : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400 hover:text-black"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">{day.label}</span>
              <span className="text-xs font-semibold mt-0.5">{day.fullDate}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-color-foreground">
          <Clock className="h-3.5 w-3.5 text-gray-500" />
          Available Times ({selectedDate.label}, {selectedDate.fullDate})
        </div>
        <div className="grid grid-cols-2 gap-2">
          {selectedDate.slots.map((time, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedTime(time)}
              className={`py-2 text-xs font-semibold border transition-all rounded-sm ${
                selectedTime === time
                  ? "border-black bg-neutral-900 text-white font-bold shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-black hover:text-black"
              }`}
            >
              {time}
            </button>
          ))}
        </div>
      </div>

      {/* Conflict Clearance Check (Opposing Party) */}
      <div className="space-y-1.5 pt-1">
        <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-amber-600" />
            Opposing Party / Company (Optional)
          </span>
          <span className="text-[10px] text-gray-400 font-normal">Conflict check</span>
        </label>
        <input
          type="text"
          value={opposingParty}
          onChange={(e) => setOpposingParty(e.target.value)}
          placeholder="e.g., Opposing individual, employer, or entity"
          className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2 text-xs focus:bg-white focus:border-black focus:outline-none transition-all rounded-sm"
        />
      </div>

      {/* CTA Button */}
      <div className="pt-2 border-t border-color-border-light">
        <button
          onClick={handleConfirm}
          disabled={!selectedTime || isBooking}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold shadow-sm transition-all rounded-sm ${
            selectedTime
              ? "bg-black text-white hover:bg-neutral-800 cursor-pointer"
              : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
          }`}
        >
          {isBooking ? (
            <span className="flex items-center gap-2 animate-pulse">
              Confirming Schedule...
            </span>
          ) : selectedTime ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Confirm {selectedDate.label} at {selectedTime}
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4" />
              Select a Time Slot to Book
            </>
          )}
        </button>
        {selectedTime && (
          <p className="text-center text-[11px] text-color-text-muted mt-2.5">
            {consultationFee === 0 
              ? "No credit card required. Confirmation and calendar invite sent immediately." 
              : `Consultation fee: $${consultationFee}. Billed after session.`}
          </p>
        )}
      </div>
    </div>
  );
}
