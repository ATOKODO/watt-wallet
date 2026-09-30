export const defaultAccent = '#315b43';

export const accentPresets = [
  { name: 'Forêt', color: defaultAccent },
  { name: 'Océan', color: '#3459a1' },
  { name: 'Lavande', color: '#7050a1' },
  { name: 'Framboise', color: '#a1486f' },
  { name: 'Terre cuite', color: '#a05b30' },
  { name: 'Lagon', color: '#287b7b' },
] as const;

export function validAccent(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function toLch(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const [r, g, b] = channels;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const labB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { lightness, chroma: Math.hypot(a, labB), hue: Math.atan2(labB, a) };
}

export function accentTone(accent: string) {
  const original = toLch(defaultAccent);
  const chosen = toLch(validAccent(accent) ? accent : defaultAccent);
  const neutral = chosen.chroma < 0.00001;
  return {
    hue: neutral ? 0 : (chosen.hue * 180) / Math.PI,
    chromaScale: neutral ? 0 : Math.min(2, chosen.chroma / original.chroma),
  };
}

// Keep perceptual lightness while changing hue and chroma, in CSS and in Three.js.
export function themeColor(source: string, accent: string): string {
  if (!validAccent(accent) || accent.toLowerCase() === defaultAccent) return source;
  const tone = accentTone(accent);
  const color = toLch(source);
  const hue = (tone.hue * Math.PI) / 180;
  const a = color.chroma * tone.chromaScale * Math.cos(hue);
  const b = color.chroma * tone.chromaScale * Math.sin(hue);
  const l = (color.lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (color.lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (color.lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return (
    '#' +
    channels
      .map((channel) => {
        const srgb = channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
        return Math.round(Math.max(0, Math.min(1, srgb)) * 255)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}
