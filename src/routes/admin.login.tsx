import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";


export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin · Login · MRT Jakarta" }] }),
  ssr: false,
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
const [checking, setChecking] = useState(true);

useEffect(() => {
  if (typeof window === "undefined") return;
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) {
      navigate({ to: "/admin" });
    } else {
      setChecking(false);
    }
  });
}, [navigate]);

if (typeof window === "undefined") return null;
if (checking) return <div style={{padding: "2rem"}}>Checking...</div>;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setError("Email atau password salah");
    } else {
      navigate({ to: "/admin" });
    }
    setLoading(false);
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

        <form onSubmit={onSubmit} className="mt-8 w-full rounded-2xl border border-border bg-card p-6">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              autoComplete="email"
              placeholder="admin@mrtjakarta.co.id"
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
            disabled={loading}
            className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Masuk..." : "Masuk"}
          </button>

          <Link
            to="/"
            className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            ← Kembali ke beranda
          </Link>
        </form>
      </div>
    </div>
  );
}