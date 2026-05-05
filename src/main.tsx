import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { supabase } from "./lib/supabase";
import "./styles.css";

const router = getRouter();

// INI yang hilang — listen ke auth changes dan invalidate router
supabase.auth.onAuthStateChange(() => {
  router.invalidate();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);