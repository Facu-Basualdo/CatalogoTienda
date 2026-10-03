import { ImageResponse } from "next/og";
import { SITIO } from "@/lib/sitio";

// Imagen por defecto al compartir un link de la tienda (las fichas usan la foto del
// producto). Mismo monograma que components/logo.tsx, en blanco y negro.
export const alt = SITIO.nombre;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="96" height="96" viewBox="0 0 24 24">
            <rect x="1" y="1" width="22" height="22" rx="3" fill="#fafafa" />
            <path d="M7 8h10M12 8v9" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="square" />
          </svg>
          <span style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>{SITIO.nombre}</span>
        </div>
        <p style={{ marginTop: 40, fontSize: 40, color: "#a3a3a3" }}>{SITIO.descripcion}</p>
      </div>
    ),
    size,
  );
}
