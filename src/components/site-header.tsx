import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg mrtj-stripe">
            <span className="text-white font-black text-xs tracking-tighter">MRT</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-foreground">Booking Ruang Stasiun</div>
            <div className="text-[11px] text-muted-foreground">MRT Jakarta</div>
          </div>
        </Link>

        <Link
          to="/admin"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Admin
        </Link>
      </div>
    </header>
  );
}
