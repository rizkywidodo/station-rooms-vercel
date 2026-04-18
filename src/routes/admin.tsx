import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Check, Clock, Mail, Search, Users, X, Plus, Pencil, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { STATUS_LABEL, ROOM_TYPE_LABEL, type Booking, type BookingStatus, type Station, type Room, type RoomType } from "@/lib/dummy-data";
import { getBookings, getRooms, getStations, updateBookingStatus, addRoom, updateRoom, deleteRoom } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard · MRT Jakarta Booking" }] }),
  ssr: false,
  component: AdminPage,
});

type Tab = "bookings" | "rooms" | "stations";

function AdminPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [roomMap, setRoomMap] = useState<Record<string, { name: string; stationId: string }>>({});
  const [stationMap, setStationMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [stationFilter, setStationFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/admin-login" });
      else setAuthed(true);
    });
  }, [navigate]);

  const fetchAll = async () => {
    const [b, r, s] = await Promise.all([getBookings(), getRooms(), getStations()]);
    setBookings(b);
    setRooms(r);
    setStations(s);
    setRoomMap(Object.fromEntries(r.map((rm) => [rm.id, { name: rm.name, stationId: rm.stationId }])));
    setStationMap(Object.fromEntries(s.map((st) => [st.id, st.name])));
    setLoading(false);
  };

  useEffect(() => { if (authed) fetchAll(); }, [authed]);

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => status === "all" ? true : b.status === status)
      .filter((b) => {
        if (stationFilter !== "all") return roomMap[b.roomId]?.stationId === stationFilter;
        if (regionFilter !== "all") {
          const stId = roomMap[b.roomId]?.stationId;
          const st = stations.find((s) => s.id === stId);
          return String(st?.region) === regionFilter;
        }
        return true;
      })
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
  }, [bookings, status, stationFilter, regionFilter, search, roomMap, stationMap, stations]);

  const counts = useMemo(() => ({
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    rejected: bookings.filter((b) => b.status === "rejected").length,
  }), [bookings]);

  if (!authed) return null;

  const decide = async (b: Booking, decision: BookingStatus) => {
    await updateBookingStatus(b.id, decision);
    if (decision === "confirmed") {
      const conflicts = bookings.filter((other) => {
        if (other.id === b.id || other.status !== "pending" || other.roomId !== b.roomId || other.date !== b.date) return false;
        return !(other.endTime <= b.startTime || other.startTime >= b.endTime);
      });
      await Promise.all(conflicts.map((c) => updateBookingStatus(c.id, "rejected")));
    }
    await fetchAll();
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "bookings", label: `Pengajuan${counts.pending > 0 ? ` (${counts.pending})` : ""}` },
    { id: "rooms", label: "Ruangan" },
    { id: "stations", label: "Stasiun" },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola booking, ruangan, dan stasiun.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 mb-8">
          <StatCard label="Menunggu" value={counts.pending} tone="warning" />
          <StatCard label="Terkonfirmasi" value={counts.confirmed} tone="success" />
          <StatCard label="Ditolak" value={counts.rejected} tone="destructive" />
        </div>
        <div className="flex gap-1 border-b border-border mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px",
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Memuat...</div>
        ) : tab === "bookings" ? (
          <BookingsTab
            filtered={filtered}
            stations={stations}
            stationFilter={stationFilter}
            setStationFilter={setStationFilter}
            regionFilter={regionFilter}
            setRegionFilter={setRegionFilter}
            status={status}
            setStatus={setStatus}
            search={search}
            setSearch={setSearch}
            roomMap={roomMap}
            stationMap={stationMap}
            onDecide={decide}
          />
        ) : tab === "rooms" ? (
          <RoomsTab stations={stations} rooms={rooms} onRefresh={fetchAll} />
        ) : (
          <StationsTab stations={stations} rooms={rooms} onRefresh={fetchAll} />
        )}
      </section>
    </div>
  );
}

// ── Bookings Tab ──────────────────────────────────────────────
function BookingsTab({ filtered, stations, stationFilter, setStationFilter, regionFilter, setRegionFilter, status, setStatus, search, setSearch, roomMap, stationMap, onDecide }: any) {
  const filteredStations = useMemo(() => {
    if (regionFilter === "all") return stations;
    return stations.filter((s: Station) => String(s.region) === regionFilter);
  }, [stations, regionFilter]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, divisi..." className="w-48 rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none" />
        </div>
        <select
          value={regionFilter}
          onChange={(e) => { setRegionFilter(e.target.value); setStationFilter("all"); }}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="all">Semua Region</option>
          <option value="1">Region 1</option>
          <option value="2">Region 2</option>
          <option value="3">Region 3</option>
        </select>
        <select value={stationFilter} onChange={(e) => setStationFilter(e.target.value)} className="rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none">
          <option value="all">Semua Stasiun</option>
          {filteredStations.map((s: Station) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none">
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="confirmed">Terkonfirmasi</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">Tidak ada pengajuan.</div>
        ) : (
          filtered.map((b: Booking) => (
            <AdminBookingRow key={b.id} booking={b} roomName={roomMap[b.roomId]?.name ?? b.roomId} stationName={stationMap[roomMap[b.roomId]?.stationId ?? ""] ?? ""} onDecide={onDecide} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Rooms Tab ──────────────────────────────────────────────
function RoomsTab({ stations, rooms, onRefresh }: { stations: Station[]; rooms: Room[]; onRefresh: () => void }) {
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [addingToStation, setAddingToStation] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState({ name: "", type: "meeting" as RoomType, capacity: 10 });
  const [saving, setSaving] = useState(false);

  const getRoomsByStation = (stationId: string) => rooms.filter((r) => r.stationId === stationId);

  const handleAdd = async (stationId: string) => {
    if (!newRoom.name.trim()) return;
    setSaving(true);
    try {
      await addRoom({ stationId, name: newRoom.name, type: newRoom.type, capacity: newRoom.capacity });
      setAddingToStation(null);
      setNewRoom({ name: "", type: "meeting", capacity: 10 });
      onRefresh();
    } catch { alert("Gagal menambah ruangan"); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingRoom) return;
    setSaving(true);
    try {
      await updateRoom(editingRoom.id, { name: editingRoom.name, type: editingRoom.type, capacity: editingRoom.capacity });
      setEditingRoom(null);
      onRefresh();
    } catch { alert("Gagal mengupdate ruangan"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus ruangan ini?")) return;
    try { await deleteRoom(id); onRefresh(); }
    catch { alert("Gagal menghapus ruangan"); }
  };

  return (
    <div className="space-y-4">
      {stations.map((s) => {
        const stRooms = getRoomsByStation(s.id);
        const isAdding = addingToStation === s.id;
        return (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold">{s.name}</h2>
                <p className="text-xs text-muted-foreground">Region {s.region} · {stRooms.length} ruangan</p>
              </div>
              <button onClick={() => { setAddingToStation(isAdding ? null : s.id); setNewRoom({ name: "", type: "meeting", capacity: 10 }); }} className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">
                <Plus className="h-3.5 w-3.5" /> Tambah
              </button>
            </div>

            {isAdding && (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Nama</label>
                    <input value={newRoom.name} onChange={(e) => setNewRoom((v) => ({ ...v, name: e.target.value }))} placeholder="Meeting Room" className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Tipe</label>
                    <select value={newRoom.type} onChange={(e) => setNewRoom((v) => ({ ...v, type: e.target.value as RoomType }))} className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none">
                      <option value="meeting">Meeting Room</option>
                      <option value="office">Station Office</option>
                      <option value="collaboration">Collaboration Room</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Kapasitas</label>
                    <input type="number" value={newRoom.capacity} onChange={(e) => setNewRoom((v) => ({ ...v, capacity: Number(e.target.value) }))} className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => handleAdd(s.id)} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"><Check className="h-3.5 w-3.5" /> Simpan</button>
                  <button onClick={() => setAddingToStation(null)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /> Batal</button>
                </div>
              </div>
            )}

            {stRooms.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada ruangan.</p>
            ) : (
              <div className="space-y-2">
                {stRooms.map((r) => {
                  const isEditing = editingRoom?.id === r.id;
                  return (
                    <div key={r.id} className="rounded-xl border border-border bg-white p-3">
                      {isEditing ? (
                        <div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">Nama</label>
                              <input value={editingRoom.name} onChange={(e) => setEditingRoom((v) => v ? { ...v, name: e.target.value } : v)} className="w-full rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">Tipe</label>
                              <select value={editingRoom.type} onChange={(e) => setEditingRoom((v) => v ? { ...v, type: e.target.value as RoomType } : v)} className="w-full rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm focus:border-primary focus:outline-none">
                                <option value="meeting">Meeting Room</option>
                                <option value="office">Station Office</option>
                                <option value="collaboration">Collaboration Room</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">Kapasitas</label>
                              <input type="number" value={editingRoom.capacity} onChange={(e) => setEditingRoom((v) => v ? { ...v, capacity: Number(e.target.value) } : v)} className="w-full rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={handleUpdate} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"><Check className="h-3.5 w-3.5" /> Simpan</button>
                            <button onClick={() => setEditingRoom(null)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /> Batal</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{r.name}</div>
                            <div className="text-xs text-muted-foreground">{ROOM_TYPE_LABEL[r.type]} · {r.capacity} orang</div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingRoom(r)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary"><Pencil className="h-3 w-3" /> Edit</button>
                            <button onClick={() => handleDelete(r.id)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-destructive/40 hover:text-destructive"><Trash2 className="h-3 w-3" /> Hapus</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Stations Tab ──────────────────────────────────────────────
function StationsTab({ stations, rooms, onRefresh }: { stations: Station[]; rooms: Room[]; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false);
  const [newStation, setNewStation] = useState({ name: "", region: 1 as 1 | 2 | 3 });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newStation.name.trim()) return;
    setSaving(true);
    try {
      const id = newStation.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { error } = await supabase.from("stations").insert({ id, name: newStation.name, region: newStation.region });
      if (error) throw error;
      setAdding(false);
      setNewStation({ name: "", region: 1 });
      onRefresh();
    } catch { alert("Gagal menambah stasiun"); }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const roomCount = rooms.filter((r) => r.stationId === id).length;
    if (roomCount > 0) {
      alert(`Tidak bisa hapus ${name} — masih ada ${roomCount} ruangan. Hapus ruangannya dulu!`);
      return;
    }
    if (!confirm(`Hapus stasiun ${name}?`)) return;
    try {
      const { error } = await supabase.from("stations").delete().eq("id", id);
      if (error) throw error;
      onRefresh();
    } catch { alert("Gagal menghapus stasiun"); }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{stations.length} stasiun terdaftar</p>
        <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">
          <Plus className="h-3.5 w-3.5" /> Tambah Stasiun
        </button>
      </div>

      {adding && (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nama Stasiun</label>
              <input value={newStation.name} onChange={(e) => setNewStation((v) => ({ ...v, name: e.target.value }))} placeholder="Cth. Glodok" className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Region</label>
              <select value={newStation.region} onChange={(e) => setNewStation((v) => ({ ...v, region: Number(e.target.value) as 1 | 2 | 3 }))} className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none">
                <option value={1}>Region 1 · Lebak Bulus → Haji Nawi</option>
                <option value={2}>Region 2 · Blok A → Istora</option>
                <option value={3}>Region 3 · Bendungan Hilir → Bundaran HI</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleAdd} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"><Check className="h-3.5 w-3.5" /> Simpan</button>
            <button onClick={() => setAdding(false)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /> Batal</button>
          </div>
        </div>
      )}

      <div className="flex flex-col">
        {stations.map((s) => {
          const roomCount = rooms.filter((r) => r.stationId === s.id).length;
          return (
            <div key={s.id} className="flex items-center justify-between border-b border-border py-3">
              <div>
                <span className="font-medium">{s.name}</span>
                <span className="ml-3 text-xs text-muted-foreground">Region {s.region} · {roomCount} ruangan</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-muted-foreground/50">{s.id}</span>
                <button
                  onClick={() => handleDelete(s.id, s.name)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Hapus
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared Components ──────────────────────────────────────────────
function StatCard({ label, value, tone }: { label: string; value: number; tone: "warning" | "success" | "destructive" }) {
  const toneCls = tone === "warning" ? "text-warning border-warning/30 bg-warning/5" : tone === "success" ? "text-success border-success/30 bg-success/5" : "text-destructive border-destructive/30 bg-destructive/5";
  return (
    <div className={cn("rounded-2xl border p-5", toneCls)}>
      <div className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}

const statusBadge: Record<BookingStatus, string> = {
  pending: "bg-warning/15 text-warning",
  confirmed: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
};

function AdminBookingRow({ booking, roomName, stationName, onDecide }: { booking: Booking; roomName: string; stationName: string; onDecide: (b: Booking, s: BookingStatus) => void; }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-row items-center justify-between w-full gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statusBadge[booking.status])}>{STATUS_LABEL[booking.status]}</span>
            <span className="text-xs text-muted-foreground">#{booking.id}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{booking.origin}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold">{stationName} · <span className="text-muted-foreground">{roomName}</span></h3>
          <p className="text-sm font-medium">{booking.requesterName}</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {booking.date}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {booking.startTime}–{booking.endTime}</span>
            <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {booking.attendees} orang</span>
            <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {booking.email}</span>
          </div>
        </div>
        {booking.status === "pending" && (
          <div className="flex shrink-0 flex-row gap-2 items-center">
            <button
              onClick={() => onDecide(booking, "confirmed")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-success/10 px-4 py-2 text-xs font-semibold text-success transition hover:bg-success/20 whitespace-nowrap"
            >
              <Check className="h-3.5 w-3.5" /> Setujui
            </button>
            <button
              onClick={() => onDecide(booking, "rejected")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/20 whitespace-nowrap"
            >
              <X className="h-3.5 w-3.5" /> Tolak
            </button>
          </div>
        )}
      </div>
      {booking.notes && (
        <p className="mt-3 w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground/70">Catatan:</strong> {booking.notes}
        </p>
      )}
    </div>
  );
}