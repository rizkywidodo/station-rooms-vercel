import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/StationComparisonCard')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/StationComparisonCard"!</div>
}
import { useMemo, useState } from "react";

import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from "recharts";

export function StationComparisonCard({
  bookings,
  stations,
  roomMap,
}: any) {
  const [mode, setMode] = useState<"weekly" | "monthly">("weekly");

  const [weekOffset, setWeekOffset] = useState(0);

  const [monthOffset, setMonthOffset] = useState(0);

  const stationData = useMemo(() => {
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

    return stations.map((station: any) => {
      const total = bookings.filter((booking: any) => {
        const stationId = roomMap[booking.roomId]?.stationId;

        if (stationId !== station.id) return false;

        const bookingDate = new Date(booking.date);

        return bookingDate >= startDate && bookingDate <= endDate;
      }).length;

      return {
        station: station.name,
        bookings: total,
      };
    });
  }, [
    bookings,
    stations,
    roomMap,
    mode,
    weekOffset,
    monthOffset,
  ]);

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
            Booking per Stasiun
          </h2>

          <p className="text-xs text-muted-foreground">
            Perbandingan penggunaan stasiun
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
          <BarChart data={stationData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="station" />

            <YAxis allowDecimals={false} />

            <Tooltip />

            <Bar
              dataKey="bookings"
              radius={[8, 8, 0, 0]}
            />
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