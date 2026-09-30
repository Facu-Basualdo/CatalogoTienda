import {
  CircleInfo,
  Cpu,
  Display,
  HardDrive,
  Layers,
  LayoutCells,
  Palette,
  Picture,
  Signal,
  Speedometer,
  Tag,
} from "@gravity-ui/icons";
import type { ComponentType, SVGProps } from "react";

// Íconos que se pueden asignar a un grupo de etiquetas (grupos_etiqueta.icono).
// Lista cerrada a propósito: importar todo @gravity-ui/icons por nombre dinámico
// mete ~800 íconos en el bundle. Para sumar uno, agregalo acá y en el selector del dashboard.
export const ICONOS_GRUPO: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  Tag,
  LayoutCells,
  Palette,
  Cpu,
  HardDrive,
  Layers,
  Speedometer,
  Display,
  Picture,
  Signal,
};

export function IconoGrupo({ nombre, className }: { nombre: string | null; className?: string }) {
  const Icono = (nombre && ICONOS_GRUPO[nombre]) || CircleInfo;
  return <Icono aria-hidden className={className} />;
}
