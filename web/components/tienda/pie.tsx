import { Logo } from "@/components/logo";
import { SITIO } from "@/lib/sitio";

export function Pie() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Logo className="text-foreground" />
        <p>{SITIO.descripcion} Proyecto de portfolio.</p>
      </div>
    </footer>
  );
}
