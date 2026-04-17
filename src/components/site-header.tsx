import { Link } from "@tanstack/react-router";
import { CalendarCheck2, ShieldCheck } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3 group">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-primary-soft transition group-hover:scale-105">
            <CalendarCheck2 className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Booking Ruang Stasiun</div>
            <div className="text-[11px] text-muted-foreground">MRT Jakarta · Real-time</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary sm:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Live
          </span>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin
          </Link>
        </div>
      </div>
    </header>
  );
}
