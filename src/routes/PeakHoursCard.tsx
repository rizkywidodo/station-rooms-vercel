import { useMemo, useState } from "react";

import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Cell,
} from "recharts";

export function PeakHoursCard({
  bookings,
}: any) {
  const [mode, setMode] = useState<"weekly" | "monthly">("weekly");

  const [weekOffset, setWeekOffset] = useState(0);

  const [monthOffset, setMonthOffset] = useState(0);

  const peakHoursData = useMemo(() => {
    const now = new Date();

    let startDate = new Date();

    let endDate = new Date();

    if (mode === "weekly") {
      now.setDate(now.getDate() + weekOffset * 7);

      const day = now.getDay();

      const diffToMonday = day === 0 ? -6 : 1 - day;

      startDate = new Date(now);

      startDate.setDate(now.getDate() + diffToMonday);

      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);

      endDate.setDate(startDate.getDate() + 6);

      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date(
        now.getFullYear(),
        now.getMonth() + monthOffset,
        1
      );

      endDate = new Date(
        now.getFullYear(),
        now.getMonth() + monthOffset + 1,
        0
      );

      endDate.setHours(23, 59, 59, 999);
    }

    const filteredBookings = bookings.filter((booking: any) => {
      const bookingDate = new Date(booking.date);

      return bookingDate >= startDate && bookingDate <= endDate;
    });

    const hours = [
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
    ];

    const hourMap: Record<string, number> = {};

    hours.forEach((h) => {
      hourMap[h] = 0;
    });

    filteredBookings.forEach((booking: any) => {
      const start = parseInt(booking.startTime.slice(0, 2));

      const end = parseInt(booking.endTime.slice(0, 2));

      for (let h = start; h < end; h++) {
        const hour = `${String(h).padStart(2, "0")}:00`;

        if (hourMap[hour] !== undefined) {
          hourMap[hour] += 1;
        }
      }
    });

    return hours.map((hour) => ({
      hour,
      bookings: hourMap[hour],
    }));
  }, [bookings, mode, weekOffset, monthOffset]);

  const maxBookings = Math.max(
    ...peakHoursData.map((d) => d.bookings)
  );

  const minBookings = Math.min(
    ...peakHoursData
      .filter((d) => d.bookings > 0)
      .map((d) => d.bookings)
  );

  const label = useMemo(() => {
    const now = new Date();

    if (mode === "weekly") {
      now.setDate(now.getDate() + weekOffset * 7);

      const day = now.getDay();

      const diffToMonday = day === 0 ? -6 : 1 - day;

      const monday = new Date(now);

      monday.setDate(now.getDate() + diffToMonday);

      const sunday = new Date(monday);

      sunday.setDate(monday.getDate() + 6);

      return `${monday.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      })} - ${sunday.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      })}`;
    }

    const targetMonth = new Date(
      now.getFullYear(),
      now.getMonth() + monthOffset,
      1
    );

    return targetMonth.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  }, [mode, weekOffset, monthOffset]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 h-[420px] flex flex-col">

      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold">
            Jam Booking Tersibuk
          </h2>

          <p className="text-xs text-muted-foreground">
            Distribusi waktu booking
          </p>
        </div>

        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setMode("weekly")}
            className={`px-3 py-1 text-xs transition cursor-pointer ${
              mode === "weekly"
                ? "bg-primary text-white"
                : "bg-background hover:bg-muted"
            }`}
          >
            Weekly
          </button>

          <button
            onClick={() => setMode("monthly")}
            className={`px-3 py-1 text-xs transition cursor-pointer ${
              mode === "monthly"
                ? "bg-primary text-white"
                : "bg-background hover:bg-muted"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={peakHoursData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="hour" />

            <YAxis allowDecimals={false} />

            <Tooltip />

            <Bar
              dataKey="bookings"
              radius={[8, 8, 0, 0]}
            >
              {peakHoursData.map((entry, index) => {
                let fill = "#94a3b8";

                if (entry.bookings === maxBookings) {
                  fill = "#16a34a";
                } else if (
                  entry.bookings === minBookings &&
                  entry.bookings > 0
                ) {
                  fill = "#dc2626";
                }

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={fill}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">

        <button
          onClick={() => {
            if (mode === "weekly") {
              setWeekOffset((v) => v - 1);
            } else {
              setMonthOffset((v) => v - 1);
            }
          }}
          className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted transition cursor-pointer"
        >
          ←
        </button>

        <span className="text-xs text-muted-foreground">
          {label}
        </span>

        <button
          onClick={() => {
            if (mode === "weekly") {
              setWeekOffset((v) => v + 1);
            } else {
              setMonthOffset((v) => v + 1);
            }
          }}
          className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted transition cursor-pointer"
        >
          →
        </button>
      </div>
    </div>
  );
}