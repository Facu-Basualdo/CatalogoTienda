import { Encabezado } from "@/components/tienda/encabezado";
import { Pie } from "@/components/tienda/pie";

export default function LayoutTienda({ children }: LayoutProps<"/">) {
  return (
    <>
      <Encabezado />
      <main className="flex-1">{children}</main>
      <Pie />
    </>
  );
}
