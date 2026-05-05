import { Link } from "@tanstack/react-router";
import { ShieldCheck, ChevronDown, LogOut, LayoutDashboard, Home, KeyRound, X, Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/db";

type Profile = { id: string; name: string; role: string; region?: number; station_id?: string };

export function SiteHeader() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setIsAdmin(true);
        const p = await getUserProfile(session.user.id);
        setProfile(p);
      } else {
        setIsAdmin(false);
        setProfile(null);
      }
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
    setLoggingOut(true);
    setDropdownOpen(false);
    const timeout = setTimeout(() => { window.location.href = "/"; }, 3000);
    try {
      await supabase.auth.signOut();
      clearTimeout(timeout);
    } catch (_) {
      clearTimeout(timeout);
    } finally {
      window.location.href = "/";
    }
  };

  const displayRole = () => {
    if (!profile) return "Admin";
    if (profile.role === "planner") return `Planner Reg ${profile.region}`;
    if (profile.role === "area_authority") {
      const stationName = profile.station_id
        ?.split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return `Area Authority ${stationName}`;
    }
    return "Admin";
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center group">
            <img src="/MRT_Jakarta_logo.png" alt="MRT Jakarta" className="h-9 w-auto" />
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
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="font-bold">{profile?.name ?? "Admin"}</span>
                    <span className="text-[10px] font-normal text-primary/70">{displayRole()}</span>
                  </div>
                  <ChevronDown className={`h-3 w-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-white shadow-lg">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-xs font-bold text-foreground">{profile?.name ?? "Admin"}</p>
                      <p className="text-[11px] text-muted-foreground">{displayRole()}</p>
                    </div>
                    <button
                      onClick={() => { setShowChangePassword(true); setDropdownOpen(false); }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground transition hover:text-primary hover:bg-primary/5 cursor-pointer"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Ganti Password
                    </button>
                    <button
                      onClick={logout}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-2 rounded-b-xl px-4 py-2.5 text-xs font-medium text-muted-foreground transition hover:text-destructive hover:bg-destructive/5 cursor-pointer disabled:opacity-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      {loggingOut ? "Logging out..." : "Logout"}
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

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Semua field harus diisi."); return;
    }
    if (newPassword.length < 6) {
      setError("Password baru minimal 8 karakter."); return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok."); return;
    }

    setLoading(true);

    // Verifikasi password lama dengan re-login
    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData.session?.user?.email;
    if (!email) { setError("Sesi tidak ditemukan, silakan login ulang."); setLoading(false); return; }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (signInError) { setError("Password saat ini salah."); setLoading(false); return; }

    // Update password baru
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) { setError(updateError.message); setLoading(false); return; }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Ganti Password</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition cursor-pointer">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <KeyRound className="h-5 w-5 text-success" />
            </div>
            <p className="font-semibold text-foreground">Password berhasil diubah!</p>
            <p className="mt-1 text-xs text-muted-foreground">Gunakan password baru kamu untuk login berikutnya.</p>
            <button
              onClick={onClose}
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:brightness-110 cursor-pointer"
            >
              Selesai
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-xs text-destructive">
                {error}
              </div>
            )}

            <PasswordField
              label="Password Saat Ini"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrent}
              onToggle={() => setShowCurrent(v => !v)}
            />
            <PasswordField
              label="Password Baru"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggle={() => setShowNew(v => !v)}
              hint="Minimal 6 karakter"
            />
            <PasswordField
              label="Konfirmasi Password Baru"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirm}
              onToggle={() => setShowConfirm(v => !v)}
            />

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60 cursor-pointer transition"
              >
                {loading ? "Menyimpan..." : "Simpan Password"}
              </button>
              <button
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-foreground">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 pr-10 text-sm focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}