import * as XLSX from "xlsx";
import type { Booking } from "@/lib/dummy-data";

export function exportMonthlyBookings(
  bookings: Booking[],
  month: number,
  year: number
) {
  const filtered = bookings.filter((b) => {
    const d = new Date(b.date);

    return (
      d.getMonth() + 1 === month &&
      d.getFullYear() === year
    );
  });

  const rows = filtered.map((b) => ({
    "Booking ID": b.id,
    "Room ID": b.roomId,
    "Tanggal": b.date,
    "Jam Mulai": b.startTime,
    "Jam Selesai": b.endTime,
    "Nama Pemohon": b.requesterName,
    Email: b.email,
    Telepon: b.phone,
    Asal: b.origin,
    "Tipe Pengunjung": b.visitorType,
    Peserta: b.attendees,
    Status: b.status,
    Kehadiran: b.attended ?? "-",
    Peralatan:
      b.equipment?.map((e) => `${e.item} (${e.qty})`).join(", ") ??
      "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Bookings"
  );

  XLSX.writeFile(
    workbook,
    `booking-report-${year}-${String(month).padStart(2, "0")}.xlsx`
  );
}