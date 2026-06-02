import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Download, MapPin, Users } from "lucide-react";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { BookingCalendar } from "@/components/booking-calendar";
import { getRooms, getStations, addBooking, addLog, getBookings } from "@/lib/db";
import { ROOM_TYPE_LABEL, type Room, type Station } from "@/lib/dummy-data";
import { sendBookingConfirmation, sendBookingNotifToStation, getStationEmail } from "@/lib/email";
import jsPDF from "jspdf";
import html2canvas from 'html2canvas-pro';

const EQUIPMENT_LIST = [
  "Proyektor",
  "Layar Proyektor",
  "Kabel Roll",
  "Whiteboard",
  "Spidol & Penghapus",
  "Kursi Tambahan",
];

const bookingSchema = z.object({
  requesterName: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  email: z.string().trim().email("Email tidak valid").max(120),
  originType: z.enum(["mrt", "mitra"]),
  originDetail: z.string().trim().min(2, "Wajib diisi").max(80),
  attendees: z.coerce.number().int().min(1, "Minimal 1 orang").max(200),
  date: z.string().min(1, "Pilih tanggal"),
  startTime: z.string().min(1, "Wajib diisi"),
  endTime: z.string().min(1, "Wajib diisi"),
  phone: z.string().trim().min(8, "Minimal 8 digit").max(20),
  visitorType: z.enum(["internal", "external"]),
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
    meta: [{ title: `Booking ${loaderData?.room.name ?? "Ruang"} · ${loaderData?.station.name ?? ""} · MRT Jakarta` }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Ruangan tidak ditemukan</h1>
        <Link to="/stations" className="mt-4 inline-block text-primary hover:underline">Kembali</Link>
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
  const [submittedBooking, setSubmittedBooking] = useState<any | null>(null);  
  const [submitting, setSubmitting] = useState(false);
  const [bookings, setBookings] = useState<import("@/lib/dummy-data").Booking[]>([]);
  const [startTime, setStartTime] = useState<string>("");
  const [visitorType, setVisitorType] = useState<"internal" | "external">("internal");
  const [equipment, setEquipment] = useState<Record<string, number>>({});

  useEffect(() => { getBookings().then(setBookings); }, []);

  const bookedSlots = useMemo(() => {
    if (!date) return [];
    return bookings
      .filter((b) => b.roomId === room.id && b.date === date && b.status === "confirmed")
      .map((b) => ({ start: parseInt(b.startTime), end: parseInt(b.endTime) }));
  }, [bookings, date, room.id]);

  const isHourBlocked = (hour: number) =>
    bookedSlots.some((slot) => hour >= slot.start && hour < slot.end);

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const currentHour = now.getHours();

  const availableStartHours = Array.from({ length: 11 }, (_, i) => i + 8).filter((h) => {
    if (date === todayIso && h <= currentHour) return false;
    return !isHourBlocked(h);
  });

  const availableEndHours = Array.from({ length: 11 }, (_, i) => i + 9).filter((h) => {
    if (date === todayIso && h <= currentHour) return false;
    if (!startTime) return true;
    const selectedStart = parseInt(startTime);
    if (h <= selectedStart) return false;
    return bookedSlots.every((slot) => slot.start >= h || slot.end <= selectedStart);
  });

  const toggleEquipment = (item: string) => {
    setEquipment((prev) => {
      if (prev[item]) {
        const next = { ...prev };
        delete next[item];
        return next;
      }
      return { ...prev, [item]: 1 };
    });
  };

  const setQty = (item: string, qty: number) => {
    if (qty < 1) return;
    setEquipment((prev) => ({ ...prev, [item]: qty }));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      requesterName: fd.get("requesterName"),
      email: fd.get("email"),
      originType,
      originDetail: fd.get("originDetail"),
      attendees: fd.get("attendees"),
      date: date ?? "",
      startTime: fd.get("startTime"),
      endTime: fd.get("endTime"),
      phone: `62${String(fd.get("phone") ?? "")
        .replace(/\D/g, "")
        .replace(/^0/, "")}`,
      visitorType,
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
    const equipmentList = Object.entries(equipment).map(([item, qty]) => ({ item, qty }));
    try {
      setSubmitting(true);
      const created = await addBooking({
        roomId: room.id,
        requesterName: d.requesterName,
        email: d.email,
        origin: d.originType === "mrt" ? `MRT — ${d.originDetail}` : `Mitra — ${d.originDetail}`,
        attendees: d.attendees,
        equipment: equipmentList,
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
        phone: d.phone,
        visitorType: d.visitorType,
      });
      setSubmittedId(created.id);
      setSubmittedBooking({
        bookingId: created.id,
        requesterName: d.requesterName,
        email: d.email,
        stationName: station.name,
        roomName: room.name,
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
      });       
      setBookings((prev) => [...prev, created]);
      await addLog(
        "SUBMIT_BOOKING",
        d.email,
        `Booking #${created.id} - ${station.name} · ${room.name} (${d.date} ${d.startTime}-${d.endTime})`
      );
       sendBookingConfirmation(d.email, {
        name: d.requesterName,
        bookingId: created.id,
        stationName: station.name,
        roomName: room.name,
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
      });

      const stationEmail = await getStationEmail(station.id);
      if (stationEmail) {
        sendBookingNotifToStation(stationEmail, {
          bookingId: created.id,
          requesterName: d.requesterName,
          origin: d.originType === "mrt" ? `MRT — ${d.originDetail}` : `Mitra — ${d.originDetail}`,
          stationName: station.name,
          roomName: room.name,
          date: d.date,
          startTime: d.startTime,
          endTime: d.endTime,
          attendees: d.attendees,
          phone: d.phone,
          visitorType: d.visitorType,
          equipment: equipmentList,
        });
      }

      } catch (err) {
      setErrors({ submit: "Gagal mengirim booking. Coba lagi." });
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedId !== null) {

    const receiptData = submittedBooking;

    if (!receiptData) return null;

    const downloadReceipt = async () => {
      try {
        const element = document.getElementById("booking-receipt");

        if (!element) return;

        const originalStyle = element.getAttribute("style");

        element.setAttribute(
          "style",
          `
            background: white;
            color: black;
            border: 1px solid #d4d4d8;
          `
        );

        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
        });

        if (originalStyle) {
          element.setAttribute("style", originalStyle);
        } else {
          element.removeAttribute("style");
        }

        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: "a4",
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();

        const imgProps = pdf.getImageProperties(imgData);

        const pdfHeight =
          (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(
          imgData,
          "PNG",
          0,
          0,
          pdfWidth,
          pdfHeight
        );

        pdf.save(`booking-${submittedId}.pdf`);
      } catch (err) {
        console.error("PDF download failed:", err);
      }
    };

    return (
      <div className="min-h-screen bg-muted/30">
        <SiteHeader />

        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h1 className="text-2xl font-bold">
              Booking berhasil dikirim
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Simpan bukti booking Anda dengan mengunduh receipt di bawah.
            </p>
          </div>

          {/* Receipt */}
          <div
            id="booking-receipt"
            className="rounded-2xl border border-border bg-white p-8 shadow-sm"
          >
            <div className="border-b border-border pb-5">
              <h2 className="text-2xl font-bold text-[#003B71]">
                Booking Ruang Stasiun MRT Jakarta
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Receipt / Bukti Pengajuan Booking
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    ID Booking
                  </span>

                  <span className="font-semibold">
                    #{receiptData.bookingId}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Pemohon
                  </span>

                  <span className="font-medium">
                    {receiptData.requesterName}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Email
                  </span>

                  <span className="font-medium">
                    {receiptData.email}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Stasiun
                  </span>

                  <span className="font-medium">
                    {receiptData.stationName}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Ruangan
                  </span>

                  <span className="font-medium">
                    {receiptData.roomName}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Tanggal
                  </span>

                  <span className="font-medium">
                    {receiptData.date}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Waktu
                  </span>

                  <span className="font-medium">
                    {receiptData.startTime} – {receiptData.endTime}
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Booking ini sudah otomatis terkonfirmasi. Harap hadir tepat waktu.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={downloadReceipt}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              <Download className="h-4 w-4" />
              Download Receipt
            </button>

            <button
              onClick={() => navigate({ to: "/" })}
              className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium transition hover:border-primary/40"
            >
              Kembali ke beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <Link to="/station/$stationId" params={{ stationId: station.id }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {station.name}
        </Link>
        <div className="mt-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {ROOM_TYPE_LABEL[room.type]}
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{room.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Stasiun {station.name}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Kapasitas {room.capacity} orang</span>
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
          <p className="mt-1 text-xs text-muted-foreground">Lengkapi data berikut. Admin akan memverifikasi dalam 1×24 jam kerja.</p>

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
            <Field label="Nomor telepon" error={errors.phone}>
              <div className="flex overflow-hidden rounded-xl border border-border bg-muted/60">
                <div className="flex items-center border-r border-border px-3 text-sm text-muted-foreground">
                  +62
                </div>

                <input
                  name="phone"
                  type="tel"
                  placeholder="8123456789"
                  className="w-full bg-transparent px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>
            </Field>            
            <Field label="Tipe pengunjung" error={errors.visitorType}>
              <div className="flex gap-2">
                <ToggleBtn active={visitorType === "internal"} onClick={() => setVisitorType("internal")}>Internal</ToggleBtn>
                <ToggleBtn active={visitorType === "external"} onClick={() => setVisitorType("external")}>Eksternal</ToggleBtn>
              </div>
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
              <input type="date" value={date ?? ""} onChange={(e) => { setDate(e.target.value); setStartTime(""); }} className={inputCls} min={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label="Jumlah peserta" error={errors.attendees}>
              <input name="attendees" type="number" min={1} max={200} placeholder="Cth. 8" className={inputCls} />
            </Field>
            <Field label="Jam mulai" error={errors.startTime}>
              <select name="startTime" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)}>
                <option value="" disabled>Pilih jam mulai</option>
                {Array.from({ length: 11 }, (_, i) => i + 8).map((h) => {
                  const timeStr = `${String(h).padStart(2, "0")}:00`;
                  const blocked = isHourBlocked(h) || (date === todayIso && h <= currentHour);
                  return (
                    <option key={h} value={timeStr} disabled={blocked} style={blocked ? { color: "#ef4444", backgroundColor: "#fef2f2" } : {}}>
                      {timeStr}{blocked ? " — Reserved" : ""}
                    </option>
                  );
                })}
              </select>
            </Field>
            <Field label="Jam selesai" error={errors.endTime}>
              <select name="endTime" className={inputCls} defaultValue="">
                <option value="" disabled>Pilih jam selesai</option>
                {Array.from({ length: 11 }, (_, i) => i + 9).map((h) => {
                  const timeStr = `${String(h).padStart(2, "0")}:00`;
                  const selectedStart = parseInt(startTime ?? "0");
                  const blocked = (date === todayIso && h <= currentHour) ||
                    h <= selectedStart ||
                    bookedSlots.some((slot) => slot.start >= selectedStart && slot.start < h);
                  return (
                    <option key={h} value={timeStr} disabled={blocked} style={blocked ? { color: "#ef4444", backgroundColor: "#fef2f2" } : {}}>
                      {timeStr}{isHourBlocked(h) ? " — Reserved" : ""}
                    </option>
                  );
                })}
              </select>
            </Field>

            <div className="sm:col-span-2">
              <span className="mb-2 block text-xs font-medium text-muted-foreground">Peralatan yang dibutuhkan (opsional)</span>
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                {EQUIPMENT_LIST.map((item) => {
                  const checked = !!equipment[item];
                  return (
                    <div key={item} className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleEquipment(item)}
                        className={`flex items-center gap-2 text-sm font-medium transition ${checked ? "text-primary" : "text-muted-foreground"}`}
                      >
                        <div className={`h-4 w-4 rounded border flex items-center justify-center transition ${checked ? "bg-primary border-primary" : "border-border bg-white"}`}>
                          {checked && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        {item}
                      </button>
                      {checked && (
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => setQty(item, (equipment[item] ?? 1) - 1)} className="h-6 w-6 rounded-lg border border-border bg-white text-sm font-bold text-muted-foreground hover:text-foreground flex items-center justify-center">−</button>
                          <span className="w-6 text-center text-sm font-semibold">{equipment[item]}</span>
                          <button type="button" onClick={() => setQty(item, (equipment[item] ?? 1) + 1)} className="h-6 w-6 rounded-lg border border-border bg-white text-sm font-bold text-muted-foreground hover:text-foreground flex items-center justify-center">+</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-10px_oklch(0.78_0.16_165/0.5)] transition hover:brightness-110 disabled:opacity-60">
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