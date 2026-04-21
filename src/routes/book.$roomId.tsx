import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, MapPin, Users } from "lucide-react";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { BookingCalendar } from "@/components/booking-calendar";
import { getRooms, getStations, addBooking, addLog } from "@/lib/db";
import { ROOM_TYPE_LABEL, type Room, type Station } from "@/lib/dummy-data";


const bookingSchema = z.object({
  requesterName: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  email: z.string().trim().email("Email tidak valid").max(120),
  originType: z.enum(["mrt", "mitra"]),
  originDetail: z.string().trim().min(2, "Wajib diisi").max(80),
  attendees: z.coerce.number().int().min(1, "Minimal 1 orang").max(200),
  notes: z.string().trim().max(500).optional().default(""),
  date: z.string().min(1, "Pilih tanggal"),
  startTime: z.string().min(1, "Wajib diisi"),
  endTime: z.string().min(1, "Wajib diisi"),
});

export const Route = createFileRoute("/book/$roomId")({
  ssr: false,
  loader: async ({ params }): Promise<{ room: Room; station: Station }> => {
  const [rooms, stations] = await Promise.all([getRooms(), getStations()]);
  const room = rooms.find((r) => r.id === params.roomId);
  if (!room) throw notFound();
  const station = stations.find((s) => s.id === room.stationId);
  if (!station) throw notFound();
  return { room, station };
},
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `Booking ${loaderData?.room.name ?? "Ruang"} · ${loaderData?.station.name ?? ""} · MRT Jakarta`,
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Ruangan tidak ditemukan</h1>
        <Link to="/stations" className="mt-4 inline-block text-primary hover:underline">
          Kembali
        </Link>
      </div>
    </div>
  ),
  component: BookRoomPage,
});

function BookRoomPage() {
  const data = Route.useLoaderData() as { room: Room; station: Station };
  const { room, station } = data;
  const navigate = useNavigate();
  const [date, setDate] = useState<string | undefined>();
  const [originType, setOriginType] = useState<"mrt" | "mitra">("mrt");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      requesterName: fd.get("requesterName"),
      email: fd.get("email"),
      originType,
      originDetail: fd.get("originDetail"),
      attendees: fd.get("attendees"),
      notes: fd.get("notes") || "",
      date: date ?? "",
      startTime: fd.get("startTime"),
      endTime: fd.get("endTime"),
    };
    const parsed = bookingSchema.safeParse(raw);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path.join(".")] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    const d = parsed.data;
    if (d.startTime >= d.endTime) {
      setErrors({ endTime: "Jam selesai harus setelah jam mulai" });
      return;
    }
    try {
      setSubmitting(true);
      const created = await addBooking({
        roomId: room.id,
        requesterName: d.requesterName,
        email: d.email,
        origin: d.originType === "mrt" ? `MRT — ${d.originDetail}` : `Mitra — ${d.originDetail}`,
        attendees: d.attendees,
        notes: d.notes,
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
      });
    setSubmittedId(created.id);
    await addLog(
      "SUBMIT_BOOKING",
      d.email,
      `Booking #${created.id} - ${station.name} · ${room.name} (${d.date} ${d.startTime}-${d.endTime})`
    );
    } catch (err) {
      setErrors({ submit: "Gagal mengirim booking. Coba lagi." });
    } finally {
      setSubmitting(false);
    }
    };

  if (submittedId !== null) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Booking diajukan!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Booking <strong className="text-foreground">#{submittedId}</strong> telah dikirim ke admin untuk dikonfirmasi. Status akan diinformasikan via email.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate({ to: "/" })}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              Kembali ke beranda
            </button>
            <button
              onClick={() => { setSubmittedId(null); setDate(undefined); }}
              className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium transition hover:border-primary/40"
            >
              Booking lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const currentHour = now.getHours();

  const availableStartHours = Array.from({ length: 11 }, (_, i) => i + 8).filter((h) => {
    if (date === todayIso) return h > currentHour;
    return true;
  });

  const availableEndHours = Array.from({ length: 11 }, (_, i) => i + 9).filter((h) => {
    if (date === todayIso) return h > currentHour;
    return true;
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <Link
          to="/station/$stationId"
          params={{ stationId: station.id }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {station.name}
        </Link>

        <div className="mt-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                {ROOM_TYPE_LABEL[room.type]}
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{room.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Stasiun {station.name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Kapasitas {room.capacity} orang
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-6xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <BookingCalendar roomId={room.id} selectedDate={date} onSelectDate={setDate} />
          <p className="mt-3 text-xs text-muted-foreground">
            Tanggal yang ditandai sudah memiliki booking. Anda tetap bisa mengajukan — admin akan memutuskan jika ada konflik.
          </p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-5 sm:p-6" noValidate>
          <h2 className="text-lg font-semibold">Form Pengajuan</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Lengkapi data berikut. Admin akan memverifikasi dalam 1×24 jam kerja.
          </p>

          {errors.submit && (
            <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
              {errors.submit}
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nama lengkap" error={errors.requesterName}>
              <input name="requesterName" placeholder="Cth. Budi Santoso" className={inputCls} maxLength={80} />
            </Field>
            <Field label="Email" error={errors.email}>
              <input name="email" type="email" placeholder="nama@mrtjakarta.co.id" className={inputCls} maxLength={120} />
            </Field>

            <Field label="Berasal dari" error={errors.originType}>
              <div className="flex gap-2">
                <ToggleBtn active={originType === "mrt"} onClick={() => setOriginType("mrt")}>MRT Jakarta</ToggleBtn>
                <ToggleBtn active={originType === "mitra"} onClick={() => setOriginType("mitra")}>Mitra Kerja</ToggleBtn>
              </div>
            </Field>
            <Field label={originType === "mrt" ? "Departemen" : "Nama perusahaan / mitra"} error={errors.originDetail}>
              <input name="originDetail" placeholder={originType === "mrt" ? "Cth. TCM, Quality" : "Cth. PT VMI"} className={inputCls} maxLength={80} />
            </Field>

            <Field label="Tanggal" error={errors.date}>
              <input
                type="date"
                value={date ?? ""}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
                min={new Date().toISOString().slice(0, 10)}
              />
            </Field>
            <Field label="Jumlah peserta" error={errors.attendees}>
              <input name="attendees" type="number" min={1} max={200} placeholder="Cth. 8" className={inputCls} />
            </Field>

           <Field label="Jam mulai" error={errors.startTime}>
            <select name="startTime" className={inputCls} defaultValue="">
              <option value="" disabled>Pilih jam mulai</option>
              {availableStartHours.map((h) => (
                <option key={h} value={`${String(h).padStart(2, "0")}:00`}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jam selesai" error={errors.endTime}>
            <select name="endTime" className={inputCls} defaultValue="">
              <option value="" disabled>Pilih jam selesai</option>
              {availableEndHours.map((h) => (
                <option key={h} value={`${String(h).padStart(2, "0")}:00`}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </Field>

            <div className="sm:col-span-2">
              <Field label="Catatan tambahan (opsional)" error={errors.notes}>
                <textarea name="notes" rows={3} placeholder="Cth. butuh kabel roll, proyektor tambahan, dll." className={inputCls + " resize-none"} maxLength={500} />
              </Field>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-10px_oklch(0.78_0.16_165/0.5)] transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? "Mengirim..." : "Ajukan Booking"}
          </button>
        </form>
      </section>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition " +
        (active ? "border-primary bg-primary/15 text-primary" : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40")
      }
    >
      {children}
    </button>
  );
}
