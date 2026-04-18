import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { REGION_LABEL, type Station, type Room } from "@/lib/dummy-data";
import { getRooms, getStations } from "@/lib/db";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/stations")({
  head: () => ({
    meta: [
      { title: "Pilih Stasiun · Booking Ruang MRT Jakarta" },
      { name: "description", content: "Daftar stasiun MRT Jakarta yang memiliki ruang yang dapat dibooking." },
    ],
  }),
  component: StationsPage,
});

function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStations(), getRooms()]).then(([s, r]) => {
      setStations(s);
      setRooms(r);
      setLoading(false);
    });
  }, []);

  const getRoomsByStation = (stationId: string) => rooms.filter((r) => r.stationId === stationId);
  const stationHasRooms = (stationId: string) => rooms.some((r) => r.stationId === stationId);
  const getStationsByRegion = (region: 1 | 2 | 3) => stations.filter((s) => s.region === region);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Pilih Stasiun</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pilih stasiun untuk melihat ruangan yang tersedia.</p>

        {loading ? (
          <div className="mt-16 text-center text-sm text-muted-foreground">Memuat...</div>
        ) : (
          <div className="mt-8 space-y-8">
            {([1, 2, 3] as const).map((region) => {
              const sts = getStationsByRegion(region);
              return (
                <div key={region}>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {REGION_LABEL[region]}
                  </p>
                  <div className="flex flex-col">
                    {sts.map((s) => {
                      const stRooms = getRoomsByStation(s.id);
                      const has = stationHasRooms(s.id);
                      return has ? (
                        <Link
                          key={s.id}
                          to="/station/$stationId"
                          params={{ stationId: s.id }}
                          className="group flex items-center justify-between border-b border-border py-3 transition hover:opacity-60"
                        >
                          <span className="font-medium">{s.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-success">{stRooms.length} ruangan</span>
                            <ArrowRight className="h-3.5 w-3.5 text-success transition group-hover:translate-x-1" />
                          </div>
                        </Link>
                      ) : (
                        <div key={s.id} className="flex items-center justify-between border-b border-border py-3 opacity-40">
                          <span className="text-muted-foreground">{s.name}</span>
                          <span className="text-xs text-muted-foreground">Tidak tersedia</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}