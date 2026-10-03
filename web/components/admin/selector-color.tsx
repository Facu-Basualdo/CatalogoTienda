"use client";

import { Button, ColorArea, ColorPicker, ColorSlider, ColorSwatch, ColorSwatchPicker, Label, parseColor } from "@heroui/react";

// Colores típicos de ropa, a un toque. El resto se elige en el área.
const PRESETS = ["#0a0a0a", "#ffffff", "#9ca3af", "#1e3a5f", "#2563eb", "#7dd3fc", "#dc2626", "#16a34a", "#d6c7a1", "#7c4a2d", "#f9a8d4", "#facc15"];

/**
 * Muestra de color de un valor de etiqueta (talle/color en la ficha). Guarda hex en
 * minúsculas, como pide el check de etiquetas.color_hex. `null` = sin muestra.
 */
export function SelectorColor({ valor, onChange, etiqueta }: { valor: string | null; onChange: (hex: string | null) => void; etiqueta: string }) {
  return (
    <div className="flex items-center gap-1">
      <ColorPicker value={parseColor(valor ?? "#9ca3af")} onChange={(c) => onChange(c.toString("hex").toLowerCase())}>
        <ColorPicker.Trigger aria-label={etiqueta}>
          {valor ? (
            <ColorSwatch size="md" className="ring-1 ring-muted/60" />
          ) : (
            <span aria-hidden className="size-7 rounded-full border border-dashed border-muted" />
          )}
          <Label className="text-sm">{valor ? "Color" : "Sin color"}</Label>
        </ColorPicker.Trigger>
        <ColorPicker.Popover className="gap-2">
          <ColorSwatchPicker className="justify-center pt-2" size="xs">
            {PRESETS.map((p) => (
              <ColorSwatchPicker.Item key={p} color={p}>
                <ColorSwatchPicker.Swatch />
              </ColorSwatchPicker.Item>
            ))}
          </ColorSwatchPicker>
          <ColorArea aria-label="Elegir color" className="max-w-full" colorSpace="hsb" xChannel="saturation" yChannel="brightness">
            <ColorArea.Thumb />
          </ColorArea>
          <ColorSlider channel="hue" className="gap-1 px-1" colorSpace="hsb" aria-label="Tono">
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>
        </ColorPicker.Popover>
      </ColorPicker>
      {valor && (
        <Button size="sm" variant="ghost" onPress={() => onChange(null)}>
          Quitar
        </Button>
      )}
    </div>
  );
}
