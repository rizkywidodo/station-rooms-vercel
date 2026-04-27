const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const FROM_EMAIL = "onboarding@resend.dev";

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.json();
    console.error("Email error:", err);
  }
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
      <p>Pengajuan booking Anda telah <strong>berhasil dikirim</strong> dan sedang menunggu konfirmasi admin.</p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>ID Booking:</strong> #${data.bookingId}</p>
        <p style="margin: 4px 0;"><strong>Stasiun:</strong> ${data.stationName}</p>
        <p style="margin: 4px 0;"><strong>Ruangan:</strong> ${data.roomName}</p>
        <p style="margin: 4px 0;"><strong>Tanggal:</strong> ${data.date}</p>
        <p style="margin: 4px 0;"><strong>Waktu:</strong> ${data.startTime} – ${data.endTime}</p>
      </div>
      <p style="color: #666; font-size: 12px;">Admin akan memverifikasi dalam 1×24 jam kerja.</p>
    </div>
    `
  );
}

export async function sendBookingApproved(to: string, data: {
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
    `Booking #${data.bookingId} Dikonfirmasi ✓ — MRT Jakarta`,
    `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #003B71;">Booking Ruang Stasiun MRT Jakarta</h2>
      <p>Halo <strong>${data.name}</strong>,</p>
      <p>Booking Anda telah <strong style="color: #16a34a;">dikonfirmasi</strong> oleh admin!</p>
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

export async function sendBookingRejected(to: string, data: {
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
    `Booking #${data.bookingId} Ditolak — MRT Jakarta`,
    `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #003B71;">Booking Ruang Stasiun MRT Jakarta</h2>
      <p>Halo <strong>${data.name}</strong>,</p>
      <p>Mohon maaf, booking Anda <strong style="color: #dc2626;">ditolak</strong> oleh admin.</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>ID Booking:</strong> #${data.bookingId}</p>
        <p style="margin: 4px 0;"><strong>Stasiun:</strong> ${data.stationName}</p>
        <p style="margin: 4px 0;"><strong>Ruangan:</strong> ${data.roomName}</p>
        <p style="margin: 4px 0;"><strong>Tanggal:</strong> ${data.date}</p>
        <p style="margin: 4px 0;"><strong>Waktu:</strong> ${data.startTime} – ${data.endTime}</p>
        ${data.reason ? `<p style="margin: 8px 0 4px;"><strong>Alasan:</strong> ${data.reason}</p>` : ""}
      </div>
      <p style="color: #666; font-size: 12px;">Silakan ajukan booking baru dengan waktu yang berbeda.</p>
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