import { useState, useRef, useEffect } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";

export const normalizeColorForInput = (color: string | undefined, fallback: string = '#1E40AF'): string => {
  if (!color) return fallback;
  if (color.length === 9 && color.startsWith('#')) {
    return color.substring(0, 7);
  }
  if (!color.startsWith('#') && (color.length === 6 || color.length === 3)) {
    return `#${color}`;
  }
  return color;
};



type ColorHexInputProps = {
  id: string;
  label: string;
  value?: string;
  fallbackColor: string;
  onChange: (value: string) => void;
};

export const ColorHexInput = ({
  id,
  label,
  value,
  fallbackColor,
  onChange,
}: ColorHexInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayColor = normalizeColorForInput(value, fallbackColor);

  // Vérifie si le navigateur supporte la pipette (Chrome / Edge / Opera)
  const supportsEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleEyeDropper = async () => {
    if (!supportsEyeDropper) return;
    try {
      // @ts-expect-error EyeDropper API native Chromium
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        onChange(result.sRGBHex.toUpperCase());
      }
    } catch {
      // L'utilisateur a annulé avec Échap
    }
  };


  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setIsOpen(false);
      }
    };
    // Phase de capture (true) pour intercepter Escape AVANT le document.addEventListener du Modal
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative flex items-center gap-3">
      {/* Pastille cliquable */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-4 h-4 border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
        style={{ backgroundColor: displayColor }}
        title={`Choisir ${label.toLowerCase()}`}
        aria-expanded={isOpen}
      />
      <label
        htmlFor={id}
        onClick={() => setIsOpen((prev) => !prev)}
        className="text-sm text-primary cursor-pointer select-none"
      >
        {label}
      </label>

      {/* Fenêtre ouverte au clic */}
      {isOpen && (
        <div className="absolute left-0 top-9 z-50 rounded-2xl border border-default bg-white p-3 shadow-xl space-y-2.5 w-[224px]">
          <HexColorPicker
            color={displayColor}
            onChange={(newColor) => onChange(newColor.toUpperCase())}
          />

          <div className="flex items-center gap-2">
            {/* Bouton Pipette */}
            {supportsEyeDropper && (
              <button
                type="button"
                onClick={handleEyeDropper}
                title="Pipette : prélever une couleur à l'écran"
                className="p-1.5 rounded-lg border border-default hover:bg-secondary text-primary transition-colors cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            )}

            {/* Pastille aperçu */}
            <div
              className="w-6 h-6 rounded-full border border-default shrink-0 shadow-xs"
              style={{ backgroundColor: displayColor }}
            />

            {/* Input HEX */}
            <div className="flex items-center flex-1 border border-default rounded-lg px-2 py-1 bg-white">
              <span className="text-xs font-mono text-secondary">#</span>
              <HexColorInput
                color={displayColor}
                onChange={(newColor) => onChange(newColor.toUpperCase())}
                className="w-full text-xs font-mono font-semibold text-primary uppercase focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};