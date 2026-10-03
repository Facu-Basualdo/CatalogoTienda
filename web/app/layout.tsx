import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITIO } from "@/lib/sitio";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITIO.url),
  title: { default: SITIO.nombre, template: `%s · ${SITIO.nombre}` },
  description: SITIO.descripcion,
  // La imagen por defecto la arma app/opengraph-image.tsx; las fichas usan la del producto.
  openGraph: { siteName: SITIO.nombre, locale: "es_AR", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
