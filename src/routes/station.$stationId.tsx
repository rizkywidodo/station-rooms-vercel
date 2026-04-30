import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ROOM_TYPE_LABEL, type Room, type Station } from "@/lib/dummy-data";
import { getRooms, getStations } from "@/lib/db";


export const Route = createFileRoute("/station/$stationId")({
  ssr: false,
  loader: async ({ params }): Promise<{ station: Station; rooms: Room[] }> => {
    const [stations, rooms] = await Promise.all([getStations(), getRooms()]);
    const station = stations.find((s) => s.id === params.stationId);
    if (!station) throw notFound();
    const stationRooms = rooms.filter((r) => r.stationId === station.id);
    return { station, rooms: stationRooms };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.station.name ?? "Stasiun"} · Booking MRT Jakarta` }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Stasiun tidak ditemukan</h1>
        <Link to="/stations" className="mt-4 inline-block text-primary hover:underline">
          Kembali ke daftar stasiun
        </Link>
      </div>
    </div>
  ),
  component: StationPage,
});

function StationPage() {
  const { station, rooms } = Route.useLoaderData() as { station: Station; rooms: Room[] };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <Link to="/stations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Daftar stasiun
        </Link>
        <div className="mt-6 max-w-xl">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Region {station.region}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Stasiun {station.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pilih ruangan yang ingin dibooking.</p>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 pb-16 sm:px-6">
        {rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Belum ada ruangan tersedia di stasiun ini.
          </div>
        ) : (
          <div className="flex flex-col">
            {rooms.map((r) => (
              <Link
                key={r.id}
                to="/book/$roomId"
                params={{ roomId: r.id }}
                className="group flex items-center justify-between border-b border-border py-4 transition hover:opacity-60"
              >
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="text-accent">{ROOM_TYPE_LABEL[r.type]}</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {r.capacity} orang
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-success transition group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}