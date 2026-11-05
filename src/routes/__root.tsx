import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { readDeskToken, setDeskToken } from "@/lib/desk-fetch";
import { DeskNotFound } from "@/lib/desk-not-found";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  notFoundComponent: DeskNotFound,
  loader: async () => {
    if (!import.meta.env.SSR) return { token: readDeskToken() };
    const { deskToken } = await import("@/lib/api-guard.server");
    return { token: deskToken() };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kerberos Security Desk" },
      { name: "theme-color", content: "#101410" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: function Root() {
    const { token } = Route.useLoaderData();
    setDeskToken(token);
    const stamp = JSON.stringify(token);
    return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: `window.__DESK_TOKEN=${stamp};` }} />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
    );
  },
});
