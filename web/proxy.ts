import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresca la sesión de Supabase del admin. El matcher es SOLO /admin: si matchea
// todo, cada visita al catálogo paga un refresco. Ver claude/web/clientes-supabase.md
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
          Object.entries(headers).forEach(([clave, valor]) => respuesta.headers.set(clave, valor));
        },
      },
    },
  );

  // getClaims verifica el JWT y refresca el token si está por vencer.
  const { data } = await supabase.auth.getClaims();
  const esLogin = request.nextUrl.pathname.startsWith("/admin/login");

  if (!data?.claims && !esLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    const redireccion = NextResponse.redirect(url);
    respuesta.cookies.getAll().forEach((c) => redireccion.cookies.set(c));
    return redireccion;
  }

  // Devolver SIEMPRE la respuesta que armó setAll: una anterior no lleva las cookies nuevas.
  return respuesta;
}

export const config = {
  matcher: ["/admin/:path*"],
};
