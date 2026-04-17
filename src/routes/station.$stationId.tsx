import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, MapPin, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BookingCalendar } from "@/components/booking-calendar";
import {
  ROOM_TYPE_LABEL,
  getRoomsByStation,
  getStation,
  type Room,
  type Station,
} from "@/lib/dummy-data";

export const Route = createFileRoute("/station/$stationId")({
  loader: ({ params }): { station: Station; rooms: Room[] } => {
    const station = getStation(params.stationId);
    if (!station) throw notFound();
    const rooms = getRoomsByStation(station.id);
    return { station, rooms };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.station.name ?? "Stasiun"} · Booking MRT Jakarta` },
      {
        name: "description",
        content: `Pilih ruangan dan lihat ketersediaan di Stasiun ${loaderData?.station.name ?? ""}.`,
      },
    ],
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
  const { station, rooms } = Route.useLoaderData();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <Link
          to="/stations"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Daftar stasiun
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Stasiun {station.name}
            </h1>
            <p className="text-sm text-muted-foreground">Region {station.region}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-6xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Ruangan tersedia
          </h2>
          {rooms.map((r) => (
            <Link
              key={r.id}
              to="/book/$roomId"
              params={{ roomId: r.id }}
              className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50 hover:bg-card-elevated sm:p-5"
            >
              <div>
                <div className="text-base font-semibold">{r.name}</div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    {ROOM_TYPE_LABEL[r.type]}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {r.capacity} orang
                  </span>
                </div>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary transition group-hover:translate-x-1">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>

        <div>
          <BookingCalendar />
        </div>
      </section>
    </div>
  );
}
