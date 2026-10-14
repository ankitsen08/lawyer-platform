"use client";

import { useState } from "react";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";

interface ConsultationBookingProps {
  lawyerId?: string;
  lawyerName: string;
  consultationFee: number; // 0 for Free
}

const mockSchedule = [
  {
    date: "Today",
    fullDate: "Sep 29",
    slots: ["10:00 AM", "01:30 PM", "03:00 PM", "04:30 PM"]
  },
  {
    date: "Tomorrow",
    fullDate: "Sep 30",
    slots: ["09:00 AM", "11:30 AM", "02:00 PM", "05:00 PM"]
  },
  {
    date: "Friday",
    fullDate: "Oct 2",
    slots: ["08:30 AM", "10:00 AM", "01:00 PM", "03:30 PM"]
  }
];

export default function ConsultationBooking({ lawyerId, lawyerName, consultationFee }: ConsultationBookingProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const { clientSession } = useAuthStore();
  const router = useRouter();

  const selectedDate = mockSchedule[selectedDayIdx];

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
      const SERVER_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
      const user = clientSession.user;

      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/consultations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: user._id || user.email,
          clientName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Client',
          clientEmail: user.email,
          clientPhone: user.phone || '',
          lawyerId: lawyerId || 'lwy-001',
          lawyerName: lawyerName,
          date: `${selectedDate.date}, ${selectedDate.fullDate}`,
          time: selectedTime,
          topic: "Direct Consultation Request",
          consultationFee: consultationFee
        })
      });

      if (!res.ok) {
        throw new Error("Failed to book consultation");
      }

      const data = await res.json();

      toast.success("Consultation Confirmed!", {
        description: `Your appointment with ${lawyerName} is confirmed for ${selectedDate.date} at ${selectedTime}.`,
        action: data.googleCalendarUrl ? {
          label: "Add to Calendar",
          onClick: () => window.open(data.googleCalendarUrl, '_blank')
        } : undefined
      });
      setSelectedTime(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to confirm booking. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  const feeText = consultationFee === 0 ? "Free" : `$${consultationFee}`;

  return (
    <div className="border border-color-border-light bg-white p-6 shadow-sm flex flex-col space-y-6">
      <div className="flex items-center justify-between border-b border-color-border-light pb-4">
        <h3 className="font-bold tracking-tight text-xl text-color-foreground">
          Book Consultation
        </h3>
        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 uppercase tracking-wide">
          {feeText}
        </span>
      </div>

      {/* Date Selection */}
      <div className="flex gap-2">
        {mockSchedule.map((day, idx) => (
          <button
            key={idx}
            onClick={() => {
              setSelectedDayIdx(idx);
              setSelectedTime(null); // Reset time on date change
            }}
            className={`flex-1 flex flex-col items-center justify-center py-3 border transition-minimal ${
              selectedDayIdx === idx
                ? "border-color-foreground bg-color-foreground text-color-background shadow-md"
                : "border-color-border-light bg-gray-50 text-color-text-muted hover:border-color-foreground hover:text-color-foreground"
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider">{day.date}</span>
            <span className="text-sm font-bold mt-1">{day.fullDate}</span>
          </button>
        ))}
      </div>

      {/* Time Slots */}
      <div>
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-color-foreground">
          <Clock className="h-4 w-4 text-color-text-muted" />
          Available Times for {selectedDate.date}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {selectedDate.slots.map((time, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedTime(time)}
              className={`py-2 text-sm font-semibold border transition-minimal ${
                selectedTime === time
                  ? "border-color-foreground bg-gray-100 text-color-foreground font-bold"
                  : "border-color-border-light bg-transparent text-color-text-muted hover:border-color-foreground hover:text-color-foreground"
              }`}
            >
              {time}
            </button>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-4 border-t border-color-border-light">
        <button
          onClick={handleConfirm}
          disabled={!selectedTime || isBooking}
          className={`w-full flex items-center justify-center gap-2 px-6 py-4 text-sm font-bold shadow-md transition-minimal ${
            selectedTime
              ? "bg-color-foreground text-color-background hover:opacity-90"
              : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
          }`}
        >
          {isBooking ? (
            <span className="flex items-center gap-2 animate-pulse">
              Confirming...
            </span>
          ) : selectedTime ? (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Confirm for {selectedDate.fullDate} at {selectedTime}
            </>
          ) : (
            <>
              <Calendar className="h-5 w-5" />
              Select a Time Slot
            </>
          )}
        </button>
        {selectedTime && (
          <p className="text-center text-xs text-color-text-muted mt-3">
            {consultationFee === 0 ? "Complimentary initial consultation." : `Consultation fee: $${consultationFee}. Billed after session.`}
          </p>
        )}
      </div>
    </div>
  );
}
