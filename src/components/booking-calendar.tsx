import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBookings } from "@/lib/db";
import type { Booking } from "@/lib/dummy-data";

interface Props {
  roomId?: string;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
}

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function isoOf(year: number, monthIdx: number, day: number) {
  return `${year}-${pad(monthIdx + 1)}-${pad(day)}`;
}


export function BookingCalendar({ roomId, selectedDate, onSelectDate }: Props) {
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [popupDate, setPopupDate] = useState<string | null>(null);

  useEffect(() => {
    getBookings().then(setBookings);
  }, []);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookings.forEach((b) => {
      if (b.status === "rejected") return;
      if (roomId && b.roomId !== roomId) return;
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b);
    });
    return map;
  }, [bookings, roomId]);

  const firstDayOfMonth = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayIso = isoOf(today.getFullYear(), today.getMonth(), today.getDate());

  const goPrev = () => setView((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const goNext = () => setView((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });

  const handleDayClick = (iso: string) => {
  const hasBooking = !!bookingsByDate[iso]?.length;
  if (hasBooking) {
    setPopupDate(popupDate === iso ? null : iso);
  } else {
    setPopupDate(null);
  }
  onSelectDate?.(iso);
};

  const popupBookings = popupDate ? (bookingsByDate[popupDate] ?? []) : [];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Kalender</h3>
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[110px] text-center text-sm font-medium">
            {MONTHS[view.month]} {view.year}
          </div>
          <button onClick={goNext} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:gap-2">
        {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} />;
          const iso = isoOf(view.year, view.month, day);
          const hasBooking = !!bookingsByDate[iso]?.length;
          const isSelected = selectedDate === iso;
          const isToday = iso === todayIso;
          const isPopup = popupDate === iso;
          return (
            <button
              key={idx}
              onClick={() => handleDayClick(iso)}
              disabled={iso < todayIso}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition",
                "border border-transparent",
                hasBooking ? "bg-primary text-primary-foreground hover:brightness-110" : "bg-muted/60 text-foreground/80 hover:bg-muted",
                isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                isToday && !isSelected && "border-primary/40",
                isPopup && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                iso < todayIso && "opacity-30 cursor-not-allowed",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Popup booking list */}
      {popupDate && popupBookings.length > 0 && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-primary">
              Booking pada {popupDate}
            </p>
            <button onClick={() => setPopupDate(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {popupBookings
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">
                  <div>
                    <span className="font-semibold">{b.startTime}–{b.endTime}</span>
                    <span className="ml-2 text-muted-foreground">{b.requesterName}</span>
                  </div>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    b.status === "confirmed" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                  )}>
                    {b.status === "confirmed" ? "Confirmed" : "Pending"}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Ada Booking</div>
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-muted" /> Kosong</div>
      </div>
    </div>
  );
}