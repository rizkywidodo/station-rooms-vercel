import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { ArrowRight, MapPin, Search, Plus } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BookingCalendar } from "@/components/booking-calendar";
import { BookingCard } from "@/components/booking-card";
import {
  REGION_LABEL,
  ROOM_TYPE_LABEL,
  STATIONS,
  type BookingStatus,
  type Booking,
  type Station,
  type Room,
} from "@/lib/dummy-data";
import { getBookings, getRooms } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Booking Ruang Stasiun · MRT Jakarta" },
      {
        name: "description",
        content:
          "Sistem reservasi real-time untuk meeting room, collaboration room, dan station office di stasiun MRT Jakarta.",
      },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getBookings(), getRooms()]).then(([b, r]) => {
      setBookings(b);
      setRooms(r);
      setLoading(false);
    });
  }, []);

  const stationHasRooms = (stationId: string) => rooms.some((r) => r.stationId === stationId);
  const getRoomsByStation = (stationId: string) => rooms.filter((r) => r.stationId === stationId);

  const getStationsByRegion = (region: 1 | 2 | 3): Station[] =>
    STATIONS.filter((s) => s.region === region);

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => (statusFilter === "all" ? true : b.status === statusFilter))
      .filter((b) => (selectedDate ? b.date === selectedDate : true))
      .filter((b) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          b.requesterName.toLowerCase().includes(q) ||
          b.origin.toLowerCase().includes(q) ||
          String(b.id).includes(q)
        );
      });
  }, [bookings, search, statusFilter, selectedDate]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <div className="rounded-3xl border border-border bg-card/60 p-6 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Sistem Reservasi Real-time
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Booking ruang stasiun{" "}
                <span className="text-gradient-primary">MRT Jakarta</span>
              </h1>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                Pilih stasiun, lihat ketersediaan, dan ajukan booking dalam beberapa langkah. Tim
                pengelola akan mengonfirmasi via email.
              </p>
            </div>
            <Link
              to="/stations"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-10px_oklch(0.78_0.16_165/0.5)] transition hover:brightness-110"
            >
              <Plus className="h-4 w-4" /> Booking Baru
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <BookingCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Pilih Stasiun</h3>
            <Link to="/stations" className="text-xs font-medium text-primary hover:underline">
              Lihat semua →
            </Link>
          </div>
          <div className="space-y-5">
            {([1, 2, 3] as const).map((region) => {
              const stations = getStationsByRegion(region).filter((s) => stationHasRooms(s.id));
              if (stations.length === 0) return null;
              return (
                <div key={region}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {REGION_LABEL[region]}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stations.map((s) => (
                      <Link
                        key={s.id}
                        to="/station/$stationId"
                        params={{ stationId: s.id }}
                        className="group inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm transition hover:border-primary/50 hover:bg-muted"
                      >
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground">
                          · {getRoomsByStation(s.id).length} ruang
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">Daftar Booking</h3>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
              <div className="relative sm:max-w-xs sm:flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari booking..."
                  className="w-full rounded-xl border border-border bg-muted/60 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "all")}
                className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="confirmed">Terkonfirmasi</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
          </div>

          {selectedDate && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              Filter tanggal: <strong className="text-foreground">{selectedDate}</strong>
              <button onClick={() => setSelectedDate(undefined)} className="text-primary hover:underline">
                hapus
              </button>
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {loading ? (
              <div className="col-span-full py-10 text-center text-sm text-muted-foreground">Memuat...</div>
            ) : filtered.length === 0 ? (
              <div className={cn("col-span-full rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground")}>
                Belum ada booking yang cocok.
              </div>
            ) : (
              filtered.map((b) => <BookingCard key={b.id} booking={b} />)
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} MRT Jakarta · Internal tool ·{" "}
        <span className="text-foreground/70">
          {Object.values(ROOM_TYPE_LABEL).join(" · ")}
        </span>{" "}
        · {STATIONS.length} stasiun
      </footer>
    </div>
  );
}
