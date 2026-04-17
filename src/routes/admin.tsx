import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Check, Clock, LogOut, Mail, Search, Users, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import {
  STATUS_LABEL,
  type Booking,
  type BookingStatus,
} from "@/lib/dummy-data";
import { getBookings, getRooms, getStations, updateBookingStatus } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard · MRT Jakarta Booking" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [roomMap, setRoomMap] = useState<Record<string, { name: string; stationId: string }>>({});
  const [stationMap, setStationMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BookingStatus | "all">("pending");

  useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    if (!data.session) {
      navigate({ to: "/admin/login" });
    } else {
      setAuthed(true);
    }
  });
}, [navigate]);

  const fetchAll = async () => {
    const [b, rooms, stations] = await Promise.all([getBookings(), getRooms(), getStations()]);
    setBookings(b);
    setRoomMap(Object.fromEntries(rooms.map((r) => [r.id, { name: r.name, stationId: r.stationId }])));
    setStationMap(Object.fromEntries(stations.map((s) => [s.id, s.name])));
    setLoading(false);
  };

  useEffect(() => {
    if (authed) fetchAll();
  }, [authed]);

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => (status === "all" ? true : b.status === status))
      .filter((b) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const room = roomMap[b.roomId];
        const stationName = room ? stationMap[room.stationId] : "";
        return (
          b.requesterName.toLowerCase().includes(q) ||
          b.origin.toLowerCase().includes(q) ||
          String(b.id).includes(q) ||
          (stationName?.toLowerCase().includes(q) ?? false) ||
          (room?.name.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [bookings, status, search, roomMap, stationMap]);

  const counts = useMemo(() => ({
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    rejected: bookings.filter((b) => b.status === "rejected").length,
  }), [bookings]);

  if (!authed) return null;

  const decide = async (b: Booking, decision: BookingStatus) => {
    await updateBookingStatus(b.id, decision);
    // Auto-reject booking lain yang konflik
    if (decision === "confirmed") {
      const conflicts = bookings.filter((other) => {
        if (other.id === b.id) return false;
        if (other.status !== "pending") return false;
        if (other.roomId !== b.roomId) return false;
        if (other.date !== b.date) return false;
        return !(other.endTime <= b.startTime || other.startTime >= b.endTime);
      });
      await Promise.all(conflicts.map((c) => updateBookingStatus(c.id, "rejected")));
    }
    await fetchAll();
  };

  const logout = async () => {
  await supabase.auth.signOut();
  navigate({ to: "/" });
};
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Kelola pengajuan booking & approval.</p>
          </div>
          <button
            onClick={logout}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="Menunggu" value={counts.pending} tone="warning" />
          <StatCard label="Terkonfirmasi" value={counts.confirmed} tone="primary" />
          <StatCard label="Ditolak" value={counts.rejected} tone="destructive" />
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Pengajuan Booking</h2>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
              <div className="relative sm:max-w-xs sm:flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari..."
                  className="w-full rounded-xl border border-border bg-muted/60 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BookingStatus | "all")}
                className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="all">Semua</option>
                <option value="pending">Menunggu</option>
                <option value="confirmed">Terkonfirmasi</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Memuat...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Tidak ada pengajuan.
              </div>
            ) : (
              filtered.map((b) => (
                <AdminBookingRow
                  key={b.id}
                  booking={b}
                  roomName={roomMap[b.roomId]?.name ?? b.roomId}
                  stationName={stationMap[roomMap[b.roomId]?.stationId ?? ""] ?? ""}
                  onDecide={decide}
                />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "warning" | "primary" | "destructive" }) {
  const toneCls =
    tone === "warning" ? "text-warning border-warning/30 bg-warning/5"
    : tone === "primary" ? "text-primary border-primary/30 bg-primary/5"
    : "text-destructive border-destructive/30 bg-destructive/5";
  return (
    <div className={cn("rounded-2xl border p-5", toneCls)}>
      <div className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}

const statusBadge: Record<BookingStatus, string> = {
  pending: "bg-warning text-warning-foreground",
  confirmed: "bg-primary text-primary-foreground",
  rejected: "bg-destructive/80 text-destructive-foreground",
};

function AdminBookingRow({
  booking,
  roomName,
  stationName,
  onDecide,
}: {
  booking: Booking;
  roomName: string;
  stationName: string;
  onDecide: (b: Booking, s: BookingStatus) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card-elevated p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statusBadge[booking.status])}>
              {STATUS_LABEL[booking.status]}
            </span>
            <span className="text-xs text-muted-foreground">#{booking.id}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{booking.origin}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold">
            {stationName} · <span className="text-muted-foreground">{roomName}</span>
          </h3>
          <p className="text-sm">{booking.requesterName}</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {booking.date}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {booking.startTime}–{booking.endTime}</span>
            <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {booking.attendees}</span>
            <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {booking.email}</span>
          </div>
          {booking.notes && (
            <p className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <strong className="text-foreground/80">Catatan:</strong> {booking.notes}
            </p>
          )}
        </div>
        {booking.status === "pending" && (
          <div className="flex shrink-0 gap-2 sm:flex-col">
            <button
              onClick={() => onDecide(booking, "confirmed")}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110 sm:flex-none"
            >
              <Check className="h-3.5 w-3.5" /> Setujui
            </button>
            <button
              onClick={() => onDecide(booking, "rejected")}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:border-destructive/50 hover:text-destructive sm:flex-none"
            >
              <X className="h-3.5 w-3.5" /> Tolak
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
