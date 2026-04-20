import { Link } from "@tanstack/react-router";
import { ShieldCheck, ChevronDown, LogOut, LayoutDashboard, Home } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export function SiteHeader() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const logout = async () => {
  await supabase.auth.signOut();
  setDropdownOpen(false);
  window.location.href = "/";
};

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg mrtj-stripe">
            <span className="text-white font-black text-xs tracking-tighter">MRT</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-foreground">Booking Ruang Stasiun</div>
            <div className="text-[11px] text-muted-foreground">MRT Jakarta</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-2 py-1.5 sm:px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
            >
              <Home className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Beranda</span>
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-2 py-1.5 sm:px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
            >
              <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Admin Panel</span>
            </Link>
          )}

          {isAdmin ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Admin</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-xl border border-border bg-white shadow-lg">
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium text-muted-foreground transition hover:text-destructive"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/admin-login"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Guest</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}