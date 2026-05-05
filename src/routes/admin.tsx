import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Check, Clock, Mail, Search, Users, X, Plus, Pencil, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { STATUS_LABEL, ROOM_TYPE_LABEL, type Booking, type BookingStatus, type Station, type Room, type RoomType } from "@/lib/dummy-data";
import { getBookings, getRooms, getStations, updateBookingStatus, addRoom, updateRoom, deleteRoom, addLog, getLogs, getLogsCount, deleteBooking, markAttended } from "@/lib/db";import { supabase } from "@/lib/supabase";
import { getUserProfile, updateStationEmail } from "@/lib/db";
import { sendBookingCancelled } from "@/lib/email";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard · MRT Jakarta Booking" }] }),
  ssr: false,
  component: AdminPage,
});

type Tab = "bookings" | "rooms" | "stations" | "logs";

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
  const [adminEmail, setAdminEmail] = useState("");
  const [profile, setProfile] = useState<{ id: string; name: string; role: string; region?: number; station_id?: string } | null>(null);
  const handleAttended = async (id: number) => {
  await markAttended(id);
  await addLog("ATTENDED", adminEmail, `Booking #${id} dikonfirmasi hadir`);
  await fetchAll();
};

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate({ to: "/admin-login" });
      } else {
        setAuthed(true);
        setAdminEmail(data.session.user.email ?? "admin");
        const p = await getUserProfile(data.session.user.id);
        setProfile(p);
      }
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

  const allowedStationIds = useMemo(() => {
    if (!profile) return null;
    if (profile.role === "planner") return stations.filter((s) => s.region === profile.region).map((s) => s.id);
    if (profile.role === "area_authority") return [profile.station_id!];
    return null; // super admin / mitski = akses semua
  }, [profile, stations]);

  const visibleStations = useMemo(() => {
    if (!allowedStationIds) return stations;
    return stations.filter((s) => allowedStationIds.includes(s.id));
  }, [stations, allowedStationIds]);

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
      .filter((b) => {
        if (!allowedStationIds) return true;
        return allowedStationIds.includes(roomMap[b.roomId]?.stationId);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bookings, status, stationFilter, regionFilter, search, roomMap, stationMap, stations, allowedStationIds]);

  const counts = useMemo(() => ({
    pending: filtered.filter((b) => b.status === "pending").length,
    confirmed: filtered.filter((b) => b.status === "confirmed").length,
    rejected: filtered.filter((b) => b.status === "rejected").length,
  }), [filtered]);

  if (!authed) return null;

  const decide = async (b: Booking, decision: BookingStatus, reason?: string) => {
  await updateBookingStatus(b.id, decision, reason);
  await addLog(
    decision === "confirmed" ? "APPROVE_BOOKING" : "REJECT_BOOKING",
    adminEmail,
    `Booking #${b.id} - ${stationMap[roomMap[b.roomId]?.stationId ?? ""] ?? ""} · ${roomMap[b.roomId]?.name ?? ""} (${b.requesterName})${reason ? ` — Alasan: ${reason}` : ""}`
  );
  if (decision === "rejected") {
    try {
      sendBookingCancelled(b.email, {
        name: b.requesterName,
        bookingId: b.id,
        stationName: stationMap[roomMap[b.roomId]?.stationId ?? ""] ?? "",
        roomName: roomMap[b.roomId]?.name ?? "",
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        reason,
      });
    } catch (e) {
      console.error("Email error:", e);
    }
  }
  await fetchAll();
};

  const handleDeleteBooking = async (id: number) => {
    if (!confirm("Hapus booking ini permanen?")) return;
    await deleteBooking(id);
    await addLog("DELETE_BOOKING", profile?.name ?? adminEmail, `Hapus booking #${id}`);
    await fetchAll();
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "bookings", label: `Pengajuan${counts.pending > 0 ? ` (${counts.pending})` : ""}` },
    { id: "rooms", label: "Ruangan" },
    { id: "stations", label: "Stasiun" },
    { id: "logs", label: "Log Aktivitas" },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile ? `${profile.name} · ${profile.role === "planner" ? `Planner Region ${profile.region}` : profile.role === "area_authority" ? `Area Authority` : "Super Admin"}` : "Kelola booking, ruangan, dan stasiun."}
          </p>
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
              "px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px cursor-pointer",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
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
            stations={visibleStations}
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
            onDelete={handleDeleteBooking}
            onAttended={handleAttended}
          />
        ) : tab === "rooms" ? (
          <RoomsTab stations={visibleStations} rooms={rooms} onRefresh={fetchAll} adminEmail={profile?.name ?? adminEmail} />
        ) : tab === "stations" ? (
          <StationsTab stations={visibleStations} rooms={rooms} onRefresh={fetchAll} adminEmail={profile?.name ?? adminEmail} />
        ) : (
          <LogsTab allowedStationIds={allowedStationIds} stationMap={stationMap} roomMap={roomMap} />
        )}
      </section>
    </div>
  );
}

function BookingsTab({ filtered, stations, stationFilter, setStationFilter, regionFilter, setRegionFilter, status, setStatus, search, setSearch, roomMap, stationMap, onDecide, onDelete, onAttended }: any) {
  const now = new Date();
  const [page, setPage] = useState(1);
  const [yearFilter, setYearFilter] = useState(0);
  const [monthFilter, setMonthFilter] = useState(0);
  const [availableYears, setAvailableYears] = useState<number[]>([now.getFullYear()]);
  const PER_PAGE = 6;

  useEffect(() => {
    const years = [...new Set(filtered.map((b: Booking) => new Date(b.date).getFullYear()))] as number[];
    if (years.length > 0) setAvailableYears(years.sort((a: number, b: number) => b - a));
  }, [filtered]);

  useEffect(() => { setPage(1); }, [filtered, yearFilter, monthFilter]);

  const filteredStations = useMemo(() => {
    if (regionFilter === "all") return stations;
    return stations.filter((s: Station) => String(s.region) === regionFilter);
  }, [stations, regionFilter]);

  const monthFiltered = useMemo(() => {
    if (yearFilter === 0 && monthFilter === 0) return filtered;
    return filtered.filter((b: Booking) => {
      const d = new Date(b.date);
      if (yearFilter > 0 && d.getFullYear() !== yearFilter) return false;
      if (monthFilter > 0 && d.getMonth() + 1 !== monthFilter) return false;
      return true;
    });
  }, [filtered, yearFilter, monthFilter]);

  const totalPages = Math.ceil(monthFiltered.length / PER_PAGE);
  const paginated = monthFiltered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, departemen..." className="w-48 rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none" />
        </div>
        <select value={regionFilter} onChange={(e) => { setRegionFilter(e.target.value); setStationFilter("all"); }} className="rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none">
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
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(Number(e.target.value))}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none cursor-pointer"
        >
          <option value={0}>Semua Tahun</option>
          {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(Number(e.target.value))}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none cursor-pointer"
        >
          <option value={0}>Semua Bulan</option>
          {monthNames.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <button
          onClick={() => { setYearFilter(now.getFullYear()); setMonthFilter(now.getMonth() + 1); setPage(1); }}
          className="text-xs text-muted-foreground hover:text-primary border border-border rounded-xl px-3 py-2 transition hover:border-primary/40 cursor-pointer"
        >
          Reset
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {monthFiltered.length === 0 ? (
          <div className="col-span-2 rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">Tidak ada pengajuan.</div>
        ) : (
          paginated.map((b: Booking) => (
            <AdminBookingRow key={b.id} booking={b} roomName={roomMap[b.roomId]?.name ?? b.roomId} stationName={stationMap[roomMap[b.roomId]?.stationId ?? ""] ?? ""} onDecide={onDecide} onDelete={onDelete} onAttended={onAttended} />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1 flex-wrap">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40 cursor-pointer">←</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1;
            return (
              <button key={p} onClick={() => setPage(p)} className={cn("rounded-xl border px-3 py-2 text-sm cursor-pointer transition", page === p ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary")}>
                {p}
              </button>
            );
          })}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40 cursor-pointer">→</button>
        </div>
      )}
    </div>
  );
}

// ── Rooms Tab ──────────────────────────────────────────────
function RoomsTab({ stations, rooms, onRefresh, adminEmail }: { stations: Station[]; rooms: Room[]; onRefresh: () => void; adminEmail: string }) {
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
      await addLog("ADD_ROOM", adminEmail, `Tambah ruangan "${newRoom.name}" di ${stations.find(s => s.id === stationId)?.name}`);
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
      await addLog("UPDATE_ROOM", adminEmail, `Edit ruangan "${editingRoom.name}"`);
      setEditingRoom(null);
      onRefresh();
    } catch { alert("Gagal mengupdate ruangan"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus ruangan ini?")) return;
    const room = rooms.find(r => r.id === id);
    try {
      await deleteRoom(id);
      await addLog("DELETE_ROOM", adminEmail, `Hapus ruangan "${room?.name ?? id}"`);
      onRefresh();
    } catch { alert("Gagal menghapus ruangan"); }
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
function StationsTab({ stations, rooms, onRefresh, adminEmail }: { stations: Station[]; rooms: Room[]; onRefresh: () => void; adminEmail: string }) {
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
      await addLog("ADD_STATION", adminEmail, `Tambah stasiun "${newStation.name}" Region ${newStation.region}`);
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
      await addLog("DELETE_STATION", adminEmail, `Hapus stasiun "${name}"`);
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
            <StationRow
              key={s.id}
              station={s}
              roomCount={roomCount}
              onDelete={() => handleDelete(s.id, s.name)}
              onRefresh={onRefresh}
              adminEmail={adminEmail}
            />
          );
        })}
      </div>
    </div>
  );
}

function StationRow({ station, roomCount, onDelete, onRefresh, adminEmail }: {
  station: Station;
  roomCount: number;
  onDelete: () => void;
  onRefresh: () => void;
  adminEmail: string;
}) {
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailValue, setEmailValue] = useState(station.email ?? "");
  const [saving, setSaving] = useState(false);

  const [currentEmail, setCurrentEmail] = useState(station.email ?? "");

const handleSaveEmail = async () => {
  setSaving(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert("Sesi expired, silakan login ulang."); setSaving(false); return; }
    await updateStationEmail(station.id, emailValue);
    await addLog("UPDATE_STATION_EMAIL", adminEmail, `Update email stasiun "${station.name}" → ${emailValue}`);
    setCurrentEmail(emailValue);
    setEditingEmail(false);
    onRefresh();
  } catch { alert("Gagal menyimpan email"); }
  setSaving(false);
};

  return (
    <div className="border-b border-border py-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{station.name}</span>
          <span className="ml-3 text-xs text-muted-foreground">Region {station.region} · {roomCount} ruangan</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted-foreground/50">{station.id}</span>
          <button
            onClick={() => setEditingEmail((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary"
          >
            <Pencil className="h-3 w-3" /> Email
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-destructive/40 hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" /> Hapus
          </button>
        </div>
      </div>

      {!editingEmail && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {currentEmail
            ? `📧 ${currentEmail}`
            : <span className="text-warning">⚠ Email belum diset</span>
          }
        </p>
      )}

      {editingEmail && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="email"
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            placeholder="email@jakartamrt.co.id"
            className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            onClick={handleSaveEmail}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" /> Simpan
          </button>
          <button
            onClick={() => { setEditingEmail(false); setEmailValue(currentEmail); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function LogsTab({ allowedStationIds, stationMap, roomMap }: { allowedStationIds: string[] | null; stationMap: Record<string, string>; roomMap: Record<string, { name: string; stationId: string }> }) {
  const now = new Date();
  const [yearFilter, setYearFilter] = useState(now.getFullYear());
  const [monthFilter, setMonthFilter] = useState(now.getMonth() + 1);
  const [availableYears, setAvailableYears] = useState<number[]>([now.getFullYear()]);
  const [logs, setLogs] = useState<{ id: number; action: string; actor: string; detail: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PER_PAGE = 20;

  useEffect(() => {
    getLogs(1000, 0).then((data) => {
      const years = [...new Set(data.map((d) => new Date(d.created_at).getFullYear()))] as number[];
      if (years.length > 0) setAvailableYears(years.sort((a, b) => b - a));
    });
  }, []);

  const fetchLogs = async (p: number, y: number, m: number) => {
    setLoading(true);
    const offset = (p - 1) * PER_PAGE;
    const [data, count] = await Promise.all([getLogs(PER_PAGE, offset, y, m), getLogsCount(y, m)]);
    setLogs(data);
    setTotalCount(count);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(page, yearFilter, monthFilter); }, [page]);
  useEffect(() => { setPage(1); fetchLogs(1, yearFilter, monthFilter); }, [yearFilter, monthFilter]);

  const filteredLogs = useMemo(() => {
    if (!allowedStationIds) return logs;
    return logs.filter((log) => {
      if (!log.detail) return false;
      return allowedStationIds.some((id) => {
        const stationName = stationMap[id];
        return log.detail!.toLowerCase().includes(stationName?.toLowerCase() ?? id);
      });
    });
  }, [logs, allowedStationIds, stationMap]);

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const actionLabel: Record<string, { label: string; color: string }> = {
    SUBMIT_BOOKING: { label: "Ajukan Booking", color: "bg-primary/15 text-primary" },
    APPROVE_BOOKING: { label: "Setujui Booking", color: "bg-success/15 text-success" },
    REJECT_BOOKING: { label: "Tolak Booking", color: "bg-destructive/15 text-destructive" },
    ADD_ROOM: { label: "Tambah Ruangan", color: "bg-accent/15 text-accent" },
    UPDATE_ROOM: { label: "Edit Ruangan", color: "bg-warning/15 text-warning" },
    DELETE_ROOM: { label: "Hapus Ruangan", color: "bg-destructive/15 text-destructive" },
    ADD_STATION: { label: "Tambah Stasiun", color: "bg-accent/15 text-accent" },
    DELETE_STATION: { label: "Hapus Stasiun", color: "bg-destructive/15 text-destructive" },
    DELETE_BOOKING: { label: "Hapus Booking", color: "bg-destructive/15 text-destructive" },
    ATTENDED: { label: "Konfirmasi Hadir", color: "bg-success/15 text-success" },
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  const handleReset = () => {
  setYearFilter(now.getFullYear());
  setMonthFilter(now.getMonth() + 1);
  setPage(1);
};

  return (
  <div>
    <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(Number(e.target.value))}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none cursor-pointer"
        >
          <option value={0}>Semua Tahun</option>
          {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(Number(e.target.value))}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none cursor-pointer"
        >
          <option value={0}>Semua Bulan</option>
          {monthNames.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <button
          onClick={handleReset}
          className="text-xs text-muted-foreground hover:text-primary border border-border rounded-xl px-3 py-2 transition hover:border-primary/40 cursor-pointer"
        >
          Reset
        </button>
        <p className="text-sm text-muted-foreground">{totalCount} aktivitas</p>
      </div>
      <button onClick={() => fetchLogs(page, yearFilter, monthFilter)} className="text-xs text-primary hover:underline cursor-pointer">
        Refresh
      </button>
    </div>

    {loading ? (
      <div className="py-10 text-center text-sm text-muted-foreground">Memuat...</div>
    ) : filteredLogs.length === 0 ? (
      <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">Belum ada aktivitas bulan ini.</div>
    ) : (
      <div className="flex flex-col">
        {filteredLogs.map((log) => {
          const info = actionLabel[log.action] ?? { label: log.action, color: "bg-muted text-muted-foreground" };
          return (
            <div key={log.id} className="flex items-start justify-between border-b border-border py-3 gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className={cn("shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", info.color)}>
                  {info.label}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{log.detail ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">{log.actor}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.created_at)}</span>
            </div>
          );
        })}
      </div>
    )}

    {totalPages > 1 && (
      <div className="mt-6 flex items-center justify-center gap-1 flex-wrap">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40 cursor-pointer">←</button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const p = i + 1;
          return (
            <button key={p} onClick={() => setPage(p)} className={cn("rounded-xl border px-3 py-2 text-sm cursor-pointer transition", page === p ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary")}>
              {p}
            </button>
          );
        })}
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40 cursor-pointer">→</button>
      </div>
    )}
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

function AdminBookingRow({ booking, roomName, stationName, onDecide, onDelete, onAttended }: { booking: Booking; roomName: string; stationName: string; onDecide: (b: Booking, s: BookingStatus, reason?: string) => void; onDelete: (id: number) => void; onAttended: (id: number) => void; }) {  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

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
          {booking.status === "confirmed" && !booking.attended && (
          <div className="flex shrink-0 flex-row gap-2 items-center">
            {(booking.attended === false || booking.attended === null || booking.attended === undefined) && (
              <button
                onClick={() => onAttended(booking.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-xs font-semibold text-success transition-all duration-200 hover:bg-success hover:text-white hover:border-success hover:scale-105 cursor-pointer whitespace-nowrap"
              >
                <Check className="h-3.5 w-3.5" /> Hadir
              </button>
            )}
            <button
              onClick={() => setShowCancelDialog(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive transition-all duration-200 hover:bg-destructive hover:text-white hover:border-destructive hover:scale-105 cursor-pointer whitespace-nowrap"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        )}
        {booking.status === "confirmed" && booking.attended && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-success/10 px-4 py-2 text-xs font-semibold text-success whitespace-nowrap">
            ✓ Digunakan
          </span>
        )}
      </div>

      {booking.equipment && booking.equipment.length > 0 && (
        <p className="mt-3 w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground/70">Peralatan:</strong>{" "}
          {booking.equipment.map((e: { item: string; qty: number }) => `${e.item} (${e.qty})`).join(", ")}
        </p>
      )}
      {booking.status === "rejected" && booking.rejectionReason && (
        <p className="mt-3 w-full rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <strong>Alasan pembatalan:</strong> {booking.rejectionReason}
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onDelete(booking.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-destructive/40 hover:text-destructive cursor-pointer transition"
        >
          <Trash2 className="h-3 w-3" /> Hapus Booking
        </button>
      </div>

      {showCancelDialog && (
        <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="mb-2 text-xs font-semibold text-destructive">Alasan pembatalan</p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Cth. Ruangan perlu digunakan untuk keperluan mendadak..."
            rows={2}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-destructive focus:outline-none resize-none"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => { onDecide(booking, "rejected", cancelReason); setShowCancelDialog(false); setCancelReason(""); }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-white hover:brightness-110 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" /> Konfirmasi Cancel
            </button>
            <button
              onClick={() => { setShowCancelDialog(false); setCancelReason(""); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
