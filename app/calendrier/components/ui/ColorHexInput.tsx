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
  const displayColor = value || fallbackColor;

  const handleTextChange = (raw: string) => {
    let formatted = raw.trim();
    if (formatted && !formatted.startsWith("#")) {
      formatted = `#${formatted}`;
    }
    if (/^#[0-9A-Fa-f]{0,6}$/.test(formatted) || formatted === "") {
      onChange(formatted.toUpperCase());
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Pilule contenant la pastille couleur + l'input hex */}
      <div className="flex items-center gap-1.5 bg-white border border-default rounded-xl p-1 shadow-sm">
        {/* Pastille cliquable liée à l'input color */}
        <label
          htmlFor={id}
          className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
          style={{ backgroundColor: normalizeColorForInput(displayColor) }}
          title={`Choisir ${label.toLowerCase()}`}
        />
        <input
          id={id}
          type="color"
          value={normalizeColorForInput(displayColor)}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
        />

        {/* Champ texte du code hexadécimal */}
        <input
          id={`${id}-text`}
          type="text"
          value={displayColor}
          onChange={(e) => handleTextChange(e.target.value)}
          maxLength={7}
          placeholder="#000000"
          className="w-20 px-1 py-0.5 text-xs font-mono font-semibold text-primary uppercase focus:outline-none bg-transparent"
        />
      </div>

      {/* Label après l'input */}
      <label htmlFor={`${id}-text`} className="text-sm text-primary cursor-pointer">
        {label}
      </label>
    </div>
  );
};