import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function WeeklyTrendCard({
  data,
  weekLabel,
  onPrev,
  onNext,
}: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 h-72 flex flex-col">

      <div className="mb-3">
        <h2 className="text-sm font-semibold">
          Tren Booking Mingguan
        </h2>

        <p className="text-xs text-muted-foreground">
          Booking per minggu
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="day" />

            <YAxis />

            <Tooltip
              labelFormatter={(label, payload) => {
                if (!payload || payload.length === 0) return label;

                const fullDate = payload[0]?.payload?.fullDate;

                if (!fullDate) return label;

                const formattedDate = new Date(fullDate).toLocaleDateString(
                  "id-ID",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }
                );

                return `${label} · ${formattedDate}`;
              }}
            />

            <Line
            type="monotone"
            dataKey="bookings"
            stroke="#2563eb"
            strokeWidth={3}
            name="Total"
            />

            <Line
            type="monotone"
            dataKey="completed"
            stroke="#16a34a"
            strokeWidth={3}
            name="Completed"
            />

            <Line
            type="monotone"
            dataKey="canceled"
            stroke="#dc2626"
            strokeWidth={3}
            name="Canceled"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        
        <button
          onClick={onPrev}
          className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted transition cursor-pointer"
        >
          ←
        </button>

        <span className="text-xs text-muted-foreground">
          {weekLabel}
        </span>

        <button
          onClick={onNext}
          className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted transition cursor-pointer"
        >
          →
        </button>

      </div>
    </div>
  );
}