import { supabase } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.json();
    console.error("Email error:", err);
  }
}

export async function getStationEmail(stationId: string): Promise<string | null> {
  const { data } = await supabase
    .from("stations")
    .select("email")
    .eq("id", stationId)
    .maybeSingle();
  return data?.email ?? null;
}

export async function sendBookingConfirmation(to: string, data: {
  name: string;
  bookingId: number;
  stationName: string;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
}) {
  await sendEmail(
    to,
    `Booking #${data.bookingId} Diterima — MRT Jakarta`,
    `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #003B71;">Booking Ruang Stasiun MRT Jakarta</h2>
      <p>Halo <strong>${data.name}</strong>,</p>
      <p>Pengajuan booking Anda telah <strong>berhasil dikirim</strong> dan sudah dikonfirmasi.</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>ID Booking:</strong> #${data.bookingId}</p>
        <p style="margin: 4px 0;"><strong>Stasiun:</strong> ${data.stationName}</p>
        <p style="margin: 4px 0;"><strong>Ruangan:</strong> ${data.roomName}</p>
        <p style="margin: 4px 0;"><strong>Tanggal:</strong> ${data.date}</p>
        <p style="margin: 4px 0;"><strong>Waktu:</strong> ${data.startTime} – ${data.endTime}</p>
      </div>
      <p style="color: #666; font-size: 12px;">Harap hadir tepat waktu. Terima kasih!</p>
    </div>
    `
  );
}

export async function sendBookingCancelled(to: string, data: {
  name: string;
  bookingId: number;
  stationName: string;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}) {
  await sendEmail(
    to,
    `Booking #${data.bookingId} Dibatalkan — MRT Jakarta`,
    `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #003B71;">Booking Ruang Stasiun MRT Jakarta</h2>
      <p>Halo <strong>${data.name}</strong>,</p>
      <p>Mohon maaf, booking Anda telah <strong style="color: #dc2626;">dibatalkan</strong> oleh admin.</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>ID Booking:</strong> #${data.bookingId}</p>
        <p style="margin: 4px 0;"><strong>Stasiun:</strong> ${data.stationName}</p>
        <p style="margin: 4px 0;"><strong>Ruangan:</strong> ${data.roomName}</p>
        <p style="margin: 4px 0;"><strong>Tanggal:</strong> ${data.date}</p>
        <p style="margin: 4px 0;"><strong>Waktu:</strong> ${data.startTime} – ${data.endTime}</p>
        ${data.reason ? `<p style="margin: 8px 0 4px;"><strong>Alasan:</strong> ${data.reason}</p>` : ""}
      </div>
      <p style="color: #666; font-size: 12px;">Silakan ajukan booking baru jika diperlukan.</p>
      <p style="color: #666; font-size: 12px;">Terima kasih atas pengertiannya.</p>
    </div>
    `
  );
}

export async function sendBookingNotifToStation(stationEmail: string, data: {
  bookingId: number;
  requesterName: string;
  origin: string;
  stationName: string;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  attendees: number;
  phone?: string;
  visitorType?: string;
  equipment?: { item: string; qty: number }[];
}) {
  await sendEmail(
    stationEmail,
    `Booking Baru #${data.bookingId} — ${data.stationName} · ${data.roomName}`,
    `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #003B71;">Notifikasi Booking Ruangan</h2>
      <p>Ada pengajuan booking baru untuk ruangan di stasiun Anda.</p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>ID Booking:</strong> #${data.bookingId}</p>
        <p style="margin: 4px 0;"><strong>Ruangan:</strong> ${data.roomName}</p>
        <p style="margin: 4px 0;"><strong>Pemohon:</strong> ${data.requesterName}</p>
        <p style="margin: 4px 0;"><strong>Asal:</strong> ${data.origin}</p>
        <p style="margin: 4px 0;"><strong>Tipe:</strong> ${data.visitorType === "internal" ? "Internal" : "Eksternal"}</p>
        ${data.phone ? `<p style="margin: 4px 0;"><strong>No. Telepon:</strong> ${data.phone}</p>` : ""}
        <p style="margin: 4px 0;"><strong>Tanggal:</strong> ${data.date}</p>
        <p style="margin: 4px 0;"><strong>Waktu:</strong> ${data.startTime} – ${data.endTime}</p>
        <p style="margin: 4px 0;"><strong>Peserta:</strong> ${data.attendees} orang</p>
        ${data.equipment && data.equipment.length > 0 ? `<p style="margin: 4px 0;"><strong>Peralatan:</strong> ${data.equipment.map(e => `${e.item} (${e.qty})`).join(", ")}</p>` : ""}
      </div>
      <p style="color: #666; font-size: 12px;">Booking ini sudah otomatis terkonfirmasi.</p>
    </div>
    `
  );
}