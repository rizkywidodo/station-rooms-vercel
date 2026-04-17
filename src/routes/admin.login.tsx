import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const ADMIN_KEY = "mrtj-admin-session";
const DEMO_USER = "admin";
const DEMO_PASS = "mrtj2026";

export function isAdminLoggedIn() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADMIN_KEY) === "1";
}

export function setAdminLoggedIn(v: boolean) {
  if (typeof window === "undefined") return;
  if (v) window.localStorage.setItem(ADMIN_KEY, "1");
  else window.localStorage.removeItem(ADMIN_KEY);
}

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin · Login · MRT Jakarta" }] }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAdminLoggedIn()) navigate({ to: "/admin" });
  }, [navigate]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (username.trim() === DEMO_USER && password === DEMO_PASS) {
      setAdminLoggedIn(true);
      navigate({ to: "/admin" });
    } else {
      setError("Username atau password salah");
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:px-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Admin Login</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Akses terbatas untuk tim pengelola.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 w-full rounded-2xl border border-border bg-card p-6"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              autoComplete="username"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Masuk
          </button>

          <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            <strong>Demo:</strong> <code>admin</code> / <code>mrtj2026</code>
            <br />
            <span className="text-foreground/60">
              (Mockup tanpa backend — auth asli akan disambungkan ke Lovable Cloud nanti.)
            </span>
          </p>

          <Link
            to="/"
            className="mt-3 block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            ← Kembali ke beranda
          </Link>
        </form>
      </div>
    </div>
  );
}
