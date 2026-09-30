"use client";

import { I18nProvider, RouterProvider, Toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { SITIO } from "@/lib/sitio";

type OpcionesRouter = NonNullable<Parameters<ReturnType<typeof useRouter>["push"]>[1]>;

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: OpcionesRouter;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {/* Los Link/Breadcrumbs de HeroUI con href navegan con el router de Next, sin recargar. */}
      <RouterProvider navigate={(href, opciones) => router.push(href, opciones)}>
        <I18nProvider locale={SITIO.locale}>
          {children}
          <Toast.Provider placement="bottom end" />
        </I18nProvider>
      </RouterProvider>
    </ThemeProvider>
  );
}
