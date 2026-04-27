import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/send-email")({
  component: () => null,
});

export async function POST(request: Request) {
  const body = await request.json();
  const RESEND_API_KEY = process.env.VITE_RESEND_API_KEY;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}