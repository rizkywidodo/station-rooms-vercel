import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import {
  REGION_LABEL,
  getRoomsByStation,
  getStationsByRegion,
  stationHasRooms,
} from "@/lib/dummy-data";

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
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Pilih Stasiun</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih stasiun untuk melihat ruangan yang tersedia.
        </p>

        <div className="mt-8 space-y-8">
          {([1, 2, 3] as const).map((region) => {
            const stations = getStationsByRegion(region);
            return (
              <div key={region}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
                  {REGION_LABEL[region]}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {stations.map((s) => {
                    const rooms = getRoomsByStation(s.id);
                    const has = stationHasRooms(s.id);
                    const Card = (
                      <div
                        className={
                          "h-full rounded-2xl border bg-card p-5 transition " +
                          (has
                            ? "border-border hover:border-primary/50 hover:bg-card-elevated"
                            : "border-border/60 opacity-60")
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                              <MapPin className="h-4 w-4" />
                            </span>
                            <div>
                              <div className="font-semibold">{s.name}</div>
                              <div className="text-[11px] text-muted-foreground">Region {s.region}</div>
                            </div>
                          </div>
                          {has ? (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {rooms.length} ruang
                            </span>
                          ) : (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              Tidak ada
                            </span>
                          )}
                        </div>
                        {has && (
                          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                            {rooms.map((r) => (
                              <li key={r.id} className="flex items-center justify-between">
                                <span>{r.name}</span>
                                <span className="text-xs">cap. {r.capacity}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );

                    return has ? (
                      <Link key={s.id} to="/station/$stationId" params={{ stationId: s.id }}>
                        {Card}
                      </Link>
                    ) : (
                      <div key={s.id}>{Card}</div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
