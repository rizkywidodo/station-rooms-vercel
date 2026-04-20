import { Calendar, Clock, QrCode, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Booking, STATUS_LABEL } from "@/lib/dummy-data";
import { useEffect, useState } from "react";
import { getRooms, getStations } from "@/lib/db";

const statusStyles: Record<Booking["status"], string> = {
  confirmed: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  rejected: "bg-destructive/15 text-destructive opacity-70",
};

const cardBorder: Record<Booking["status"], string> = {
  confirmed: "border-success/30",
  pending: "border-warning/30",
  rejected: "border-destructive/30 opacity-70",
};

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function BookingCard({ booking }: { booking: Booking }) {
  const [roomName, setRoomName] = useState("");
  const [stationName, setStationName] = useState("");

  useEffect(() => {
    Promise.all([getRooms(), getStations()]).then(([rooms, stations]) => {
      const room = rooms.find((r) => r.id === booking.roomId);
      const station = room ? stations.find((s) => s.id === room.stationId) : undefined;
      setRoomName(room?.name ?? "—");
      setStationName(station?.name ?? "—");
    });
  }, [booking.roomId]);

  return (
  <div className={cn("rounded-2xl border bg-card p-4 transition hover:border-primary/40 sm:p-5", cardBorder[booking.status])}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statusStyles[booking.status])}>
            {STATUS_LABEL[booking.status]}
          </span>
          <span className="text-xs text-muted-foreground">#{booking.id}</span>
        </div>
        <h4 className="truncate text-base font-semibold">{stationName}</h4>
        <p className="text-sm text-muted-foreground">{roomName} · {booking.requesterName}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {formatDate(booking.date)}</span>
          <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {booking.startTime} – {booking.endTime}</span>
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {booking.attendees} orang</span>
        </div>
        {booking.rejectionReason && (
          <p className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <strong>Alasan penolakan:</strong> {booking.rejectionReason}
          </p>
        )}
      </div>
      <button aria-label="QR booking" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
        <QrCode className="h-4 w-4" />
      </button>
    </div>
  </div>
);
}