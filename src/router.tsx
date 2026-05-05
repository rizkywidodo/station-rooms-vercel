import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div>
      <h1>Something went wrong</h1>
      {import.meta.env.DEV && error.message && (
        <pre>{error.message}</pre>
      )}
      <button onClick={() => { router.invalidate(); reset(); }}>Try again</button>
      <a href="/">Go home</a>
    </div>
  );
}

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {
      session: null,
    },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
    defaultSsr: false,
  });
  return router;
};
