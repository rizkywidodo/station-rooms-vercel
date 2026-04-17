import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { ArrowRight, MapPin, Search, Clock, Users, Calendar } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BookingCard } from "@/components/booking-card";
import {
  REGION_LABEL,
  ROOM_TYPE_LABEL,
  STATIONS,
  type BookingStatus,
  type Booking,
  type Room,
  type Station,
} from "@/lib/dummy-data";
import { getBookings, getRooms } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Booking Ruang Stasiun · MRT Jakarta" },
      { name: "description", content: "Sistem reservasi ruangan back-of-house stasiun MRT Jakarta." },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
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
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/5 px-3 py-1 text-xs font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Internal Tool · MRT Jakarta
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Booking<br />
            <span className="text-gradient-primary">Ruang Stasiun.</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg max-w-lg">
            Reservasi ruangan back-of-house di 13 stasiun MRT Jakarta. Pilih stasiun, cek ketersediaan, ajukan dalam hitungan detik.
          </p>
          <Link
            to="/stations"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-70"
          >
            Booking Sekarang <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Stations */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Stasiun</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pilih stasiun untuk lihat ruangan yang tersedia</p>
          </div>
          <Link to="/stations" className="text-xs font-semibold text-primary hover:underline">
            Lihat semua →
          </Link>
        </div>

        <div className="space-y-8">
          {([1, 2, 3] as const).map((region) => {
            const stations = getStationsByRegion(region);
            return (
              <div key={region}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {REGION_LABEL[region]}
                </p>
                <div className="flex flex-col">
                  {stations.map((s) => {
                    const hasRooms = stationHasRooms(s.id);
                    const roomCount = getRoomsByStation(s.id).length;
                    return (
                      <StationCard
                        key={s.id}
                        station={s}
                        roomCount={roomCount}
                        hasRooms={hasRooms}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Bookings */}
      <section className="mx-auto max-w-6xl px-4 py-12 pb-20 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Daftar Booking</h2>
            <p className="mt-1 text-sm text-muted-foreground">Semua pengajuan yang masuk</p>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, divisi, ID..."
              className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <input
            type="date"
            value={selectedDate ?? ""}
            onChange={(e) => setSelectedDate(e.target.value || undefined)}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "all")}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="confirmed">Terkonfirmasi</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {loading ? (
            <div className="col-span-full py-16 text-center text-sm text-muted-foreground">Memuat...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
              Belum ada booking.
            </div>
          ) : (
            filtered.map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} MRT Jakarta · Internal Tool · {STATIONS.length} stasiun ·{" "}
        {Object.values(ROOM_TYPE_LABEL).join(" · ")}
      </footer>
    </div>
  );
}

function StationCard({ station, roomCount, hasRooms }: { station: Station; roomCount: number; hasRooms: boolean }) {
  if (!hasRooms) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-border">
        <span className="text-muted-foreground">{station.name}</span>
        <span className="text-xs text-muted-foreground/50">Tidak tersedia</span>
      </div>
    );
  }

  return (
    <Link
      to="/station/$stationId"
      params={{ stationId: station.id }}
      className="group flex items-center justify-between py-3 border-b border-border transition hover:opacity-60"
    >
      <span className="text-base font-medium">{station.name}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-success font-medium">{roomCount} ruangan</span>
        <ArrowRight className="h-3.5 w-3.5 text-success transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}