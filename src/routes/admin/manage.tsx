import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Check, ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { getStations, getRooms, addRoom, updateRoom, deleteRoom } from "@/lib/db";
import { ROOM_TYPE_LABEL, type Station, type Room, type RoomType } from "@/lib/dummy-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/manage")({
  ssr: false,
  head: () => ({ meta: [{ title: "Kelola Ruangan · Admin MRT Jakarta" }] }),
  component: ManagePage,
});

function ManagePage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [addingToStation, setAddingToStation] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState({ name: "", type: "meeting" as RoomType, capacity: 10 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/admin-login" });
      else setAuthed(true);
    });
  }, [navigate]);

  const fetchAll = async () => {
    const [s, r] = await Promise.all([getStations(), getRooms()]);
    setStations(s);
    setRooms(r);
    setLoading(false);
  };

  useEffect(() => { if (authed) fetchAll(); }, [authed]);

  const getRoomsByStation = (stationId: string) => rooms.filter((r) => r.stationId === stationId);

  const handleAddRoom = async (stationId: string) => {
    if (!newRoom.name.trim()) return;
    setSaving(true);
    try {
      await addRoom({ stationId, name: newRoom.name, type: newRoom.type, capacity: newRoom.capacity });
      setAddingToStation(null);
      setNewRoom({ name: "", type: "meeting", capacity: 10 });
      await fetchAll();
    } catch (e) {
      alert("Gagal menambah ruangan");
    }
    setSaving(false);
  };

  const handleUpdateRoom = async () => {
    if (!editingRoom) return;
    setSaving(true);
    try {
      await updateRoom(editingRoom.id, { name: editingRoom.name, type: editingRoom.type, capacity: editingRoom.capacity });
      setEditingRoom(null);
      await fetchAll();
    } catch (e) {
      alert("Gagal mengupdate ruangan");
    }
    setSaving(false);
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm("Hapus ruangan ini?")) return;
    try {
      await deleteRoom(id);
      await fetchAll();
    } catch (e) {
      alert("Gagal menghapus ruangan");
    }
  };

  if (!authed) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 pt-8 pb-16 sm:px-6">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Admin Dashboard
        </Link>

        <div className="mt-4 mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Kelola Ruangan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tambah, edit, atau hapus ruangan per stasiun.</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Memuat...</div>
        ) : (
          <div className="space-y-6">
            {stations.map((s) => {
              const stRooms = getRoomsByStation(s.id);
              const isAdding = addingToStation === s.id;
              return (
                <div key={s.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-bold text-base">{s.name}</h2>
                      <p className="text-xs text-muted-foreground">Region {s.region} · {stRooms.length} ruangan</p>
                    </div>
                    <button
                      onClick={() => { setAddingToStation(isAdding ? null : s.id); setNewRoom({ name: "", type: "meeting", capacity: 10 }); }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                    >
                      <Plus className="h-3.5 w-3.5" /> Tambah Ruangan
                    </button>
                  </div>

                  {isAdding && (
                    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <p className="mb-3 text-xs font-semibold text-primary">Ruangan Baru</p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Nama</label>
                          <input
                            value={newRoom.name}
                            onChange={(e) => setNewRoom((v) => ({ ...v, name: e.target.value }))}
                            placeholder="Meeting Room"
                            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Tipe</label>
                          <select
                            value={newRoom.type}
                            onChange={(e) => setNewRoom((v) => ({ ...v, type: e.target.value as RoomType }))}
                            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          >
                            <option value="meeting">Meeting Room</option>
                            <option value="office">Station Office</option>
                            <option value="collaboration">Collaboration Room</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Kapasitas</label>
                          <input
                            type="number"
                            value={newRoom.capacity}
                            onChange={(e) => setNewRoom((v) => ({ ...v, capacity: Number(e.target.value) }))}
                            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleAddRoom(s.id)}
                          disabled={saving}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                        >
                          <Check className="h-3.5 w-3.5" /> Simpan
                        </button>
                        <button
                          onClick={() => setAddingToStation(null)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" /> Batal
                        </button>
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
                                    <input
                                      value={editingRoom.name}
                                      onChange={(e) => setEditingRoom((v) => v ? { ...v, name: e.target.value } : v)}
                                      className="w-full rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Tipe</label>
                                    <select
                                      value={editingRoom.type}
                                      onChange={(e) => setEditingRoom((v) => v ? { ...v, type: e.target.value as RoomType } : v)}
                                      className="w-full rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                    >
                                      <option value="meeting">Meeting Room</option>
                                      <option value="office">Station Office</option>
                                      <option value="collaboration">Collaboration Room</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Kapasitas</label>
                                    <input
                                      type="number"
                                      value={editingRoom.capacity}
                                      onChange={(e) => setEditingRoom((v) => v ? { ...v, capacity: Number(e.target.value) } : v)}
                                      className="w-full rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                    />
                                  </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <button onClick={handleUpdateRoom} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
                                    <Check className="h-3.5 w-3.5" /> Simpan
                                  </button>
                                  <button onClick={() => setEditingRoom(null)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground">
                                    <X className="h-3.5 w-3.5" /> Batal
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium">{r.name}</div>
                                  <div className="mt-0.5 text-xs text-muted-foreground">
                                    {ROOM_TYPE_LABEL[r.type]} · {r.capacity} orang
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingRoom(r)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                                  >
                                    <Pencil className="h-3 w-3" /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRoom(r.id)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" /> Hapus
                                  </button>
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
        )}
      </section>
    </div>
  );
}