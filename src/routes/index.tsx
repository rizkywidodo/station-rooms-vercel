import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { ArrowRight, Search, Plus, Users, ChevronDown } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BookingCard } from "@/components/booking-card";
import { supabase } from "@/lib/supabase";
import {
  REGION_LABEL,
  ROOM_TYPE_LABEL,
  STATIONS,
  type BookingStatus,
  type Booking,
  type Room,
  type Station,
} from "@/lib/dummy-data";
import { getBookings, getRooms, getStations } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  ssr: false,
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
  const [stations, setStations] = useState<Station[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [stationFilter, setStationFilter] = useState<string>("all");
  const [openStation, setOpenStation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "date">("newest");
  const [perPage, setPerPage] = useState(8);

  useEffect(() => {
  const handleResize = () => setPerPage(window.innerWidth < 768 ? 4 : 8);
  handleResize();
}, []);

  useEffect(() => {
  let cancelled = false;

  const fetchData = async (retries = 3) => {
    try {
      const [b, r, s] = await Promise.all([getBookings(), getRooms(), getStations()]);
      if (!cancelled) {
        setBookings(b);
        setRooms(r);
        setStations(s);
        setLoading(false);
      }
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchData(retries - 1), 1000);
      } else {
        if (!cancelled) setLoading(false);
      }
    }
  };

  fetchData();

  // Re-fetch kalau user baru login/logout
  const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
    setLoading(true);
    fetchData();
  });

  return () => {
    cancelled = true;
    subscription.unsubscribe();
  };
}, []);

  const roomMap = useMemo(() =>
    Object.fromEntries(rooms.map((r) => [r.id, { name: r.name, stationId: r.stationId }])),
    [rooms]
  );

  const stationMap = useMemo(() =>
    Object.fromEntries(stations.map((s) => [s.id, s])),
    [stations]
  );

  const stationHasRooms = (stationId: string) => rooms.some((r) => r.stationId === stationId);
  const getRoomsByStation = (stationId: string) => rooms.filter((r) => r.stationId === stationId);
  const getStationsByRegion = (region: 1 | 2 | 3): Station[] =>
    stations.filter((s) => s.region === region);

  const filteredStationsForDropdown = useMemo(() => {
  if (regionFilter === "all") return stations.filter((s) => stationHasRooms(s.id));
  return stations.filter((s) => String(s.region) === regionFilter && stationHasRooms(s.id));
}, [stations, rooms, regionFilter]);

const filtered = useMemo(() => {
  const result = bookings
    .filter((b) => statusFilter === "all" ? true : b.status === statusFilter)
    .filter((b) => {
  const bookingDate = new Date(b.date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(today.getDate() + 7);
  return bookingDate >= today && bookingDate <= sevenDaysLater;
})
    .filter((b) => selectedDate ? b.date === selectedDate : true)
    .filter((b) => {
      if (stationFilter !== "all") return roomMap[b.roomId]?.stationId === stationFilter;
      if (regionFilter !== "all") {
        const stId = roomMap[b.roomId]?.stationId;
        const st = stationMap[stId];
        return String(st?.region) === regionFilter;
      }
      return true;
    })
    .filter((b) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        b.requesterName.toLowerCase().includes(q) ||
        b.origin.toLowerCase().includes(q) ||
        String(b.id).includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return a.date < b.date ? -1 : 1;
    });
  return result;
}, [bookings, search, statusFilter, selectedDate, regionFilter, stationFilter, roomMap, stationMap, sortBy]);

const totalPages = Math.ceil(filtered.length / perPage);
const paginated = filtered.slice((page - 1) * perPage, page * perPage);

useEffect(() => { setPage(1); }, [search, statusFilter, selectedDate, regionFilter, stationFilter, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-10 pb-10 sm:px-6">
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6"><div className="h-px bg-border" /></div>

      {/* Stations */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Stasiun</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pilih stasiun untuk lihat ruangan yang tersedia</p>
          </div>
          <Link to="/stations" className="text-xs font-semibold text-primary hover:underline">Lihat semua →</Link>
        </div>
        <div className="space-y-8">
          {([1, 2, 3] as const).map((region) => {
            const sts = getStationsByRegion(region);

            return (
              <div key={region}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {REGION_LABEL[region]}
                </p>

                <div className="flex flex-col">
                  {sts.map((s) => {
                    const hasRooms = stationHasRooms(s.id);

                    const stationRooms = getRoomsByStation(s.id);

                    const roomCount = stationRooms.length;

                    const today = new Date().toISOString().slice(0, 10);

                    const todayBookings = bookings.filter(
                      (b) =>
                        stationRooms.some((r) => r.id === b.roomId) &&
                        b.date === today &&
                        b.status !== "rejected"
                    );

                    let status = "Tersedia";

                    let statusClass =
                      "bg-green-100 text-green-700 border-green-200";

                    if (todayBookings.length > 0) {
                      status = "Dipesan Sebagian";

                      statusClass =
                        "bg-yellow-100 text-yellow-700 border-yellow-200";
                    }

                    const fullyBookedRooms = stationRooms.filter((room) => {
                      const roomBookings = todayBookings.filter(
                        (b) => b.roomId === room.id
                      );

                      const occupiedHours = new Set<number>();

                      roomBookings.forEach((b) => {
                        const start = parseInt(b.startTime.slice(0, 2));

                        const end = parseInt(b.endTime.slice(0, 2));

                        for (let h = start; h < end; h++) {
                          occupiedHours.add(h);
                        }
                      });

                      const now = new Date();

                      const isToday =
                        today === now.toISOString().slice(0, 10);

                      if (isToday) {
                        const currentHour = now.getHours();

                        for (let h = 8; h <= currentHour; h++) {
                          occupiedHours.add(h);
                        }
                      }

                      return occupiedHours.size >= 11;
                    });

                    if (
                      roomCount > 0 &&
                      fullyBookedRooms.length === roomCount
                    ) {
                      status = "Sudah Penuh";

                      statusClass =
                        "bg-red-100 text-red-700 border-red-200";
                    }

                    return hasRooms ? (
                      <div
                        key={s.id}
                        className="border-b border-border"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenStation(
                              openStation === s.id ? null : s.id
                            )
                          }
                          className="group flex w-full items-center justify-between py-3 transition hover:opacity-60"
                        >
                        <div>
                          <span className="font-medium">
                            {s.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-success font-medium">
                            {roomCount} ruangan
                          </span>

                          <span className="text-xs text-muted-foreground">
                            •
                          </span>

                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
                            >
                              {status}
                            </span>

                          <ChevronDown className="h-3.5 w-3.5 text-success transition group-hover:translate-x-1" />
                        </div>
                        {/* <ArrowRight className="h-3.5 w-3.5 text-success transition group-hover:translate-x-1" /> */}
                        </button>

                        {openStation === s.id && (
                          <div className="pb-3 space-y-2 animate-in fade-in duration-200">
                            {stationRooms.map((room) => {
                            const OPEN_HOUR = 8;
                            const CLOSE_HOUR = 19;

                            const now = new Date();
                            const currentHour = now.getHours();

                            const isToday = today === now.toISOString().slice(0, 10);

                            const roomBookings = bookings.filter(
                              (b) =>
                                b.roomId === room.id &&
                                b.date === today &&
                                b.status !== "rejected"
                            );

                            const bookedHours = new Set<number>();

                            roomBookings.forEach((b) => {
                              const start = parseInt(b.startTime.slice(0, 2));
                              const end = parseInt(b.endTime.slice(0, 2));

                              for (let h = start; h < end; h++) {
                                bookedHours.add(h);
                              }
                            });

                            let availableHours = 0;

                            for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
                              const isPastHour = isToday && h <= currentHour;

                              if (!isPastHour && !bookedHours.has(h)) {
                                availableHours++;
                              }
                            }

                            let roomStatus = "Tersedia";

                            let roomStatusClass =
                              "bg-green-100 text-green-700 border-green-200";

                            if (availableHours === 0) {
                              roomStatus = "Sudah Penuh";

                              roomStatusClass =
                                "bg-red-100 text-red-700 border-red-200";
                            } else if (bookedHours.size > 0) {
                              roomStatus = "Dipesan Sebagian";

                              roomStatusClass =
                                "bg-yellow-100 text-yellow-700 border-yellow-200";
                            }                      
                              return (
                                <Link
                                  key={room.id}
                                  to="/book/$roomId"
                                  params={{ roomId: room.id }}
                                  className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 transition hover:bg-muted/60"
                                >
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="font-semibold">{room.name}</div>

                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roomStatusClass}`}
                                      >
                                        {roomStatus}
                                      </span>
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                                      <span className="text-accent">{ROOM_TYPE_LABEL[room.type]}</span>
                                      <span className="inline-flex items-center gap-1">
                                        <Users className="h-3 w-3" /> {room.capacity} orang
                                      </span>
                                    </div>
                                  </div>

                                  <ArrowRight className="h-4 w-4 text-primary" />
                                </Link>
                              );

                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        key={s.id}
                        className="flex items-center justify-between border-b border-border py-3 opacity-40"
                      >
                        <span className="text-muted-foreground">
                          {s.name}
                        </span>

                        <span className="text-xs text-muted-foreground">
                          Tidak tersedia
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6"><div className="h-px bg-border" /></div>

      {/* Bookings */}
      <section className="mx-auto max-w-7xl px-4 py-12 pb-20 sm:px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-black tracking-tight">Daftar Booking</h2>
          <p className="mt-1 text-sm text-muted-foreground">Semua pengajuan yang masuk</p>
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, departemen, ID..."
                className="w-48 rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <select
              value={regionFilter}
              onChange={(e) => { setRegionFilter(e.target.value); setStationFilter("all"); }}
              className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value="all">Semua Region</option>
              <option value="1">Region 1</option>
              <option value="2">Region 2</option>
              <option value="3">Region 3</option>
            </select>
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value="all">Semua Stasiun</option>
              {filteredStationsForDropdown.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
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

  <div className="flex items-center gap-2">
    <span className="text-xs text-muted-foreground">Urutkan:</span>
    <div className="flex rounded-xl border border-border bg-white overflow-hidden">
      {(["newest", "oldest", "date"] as const).map((s) => (
        <button
          key={s}
          onClick={() => setSortBy(s)}
          className={cn(
            "px-3 py-2 text-xs font-medium transition cursor-pointer",
            sortBy === s ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {s === "newest" ? "Terbaru" : s === "oldest" ? "Terlama" : "Tanggal"}
        </button>
      ))}
    </div>
  </div>
</div>

        <div className="grid gap-3 sm:grid-cols-2">
        {loading ? (
          <div className="col-span-full py-16 text-center text-sm text-muted-foreground">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className={cn("col-span-full rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground")}>
            Belum ada booking.
          </div>
        ) : (
          paginated.map((b) => <BookingCard key={b.id} booking={b} />)
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-40 cursor-pointer"
          >
            ← Prev
          </button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-40 cursor-pointer"
          >
            Next →
          </button>
        </div>
)}
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
  © {new Date().getFullYear()} MRT Jakarta · Internal Tool · Abizar · Rizky · Sabrina
    </footer>
    </div>
  );
}