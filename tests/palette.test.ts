import { describe, expect, it } from 'vitest';
import { accentTone, defaultAccent, themeColor, validAccent } from '../src/app/ui/palette';

describe('palette de thème', () => {
  it('garde les couleurs d’origine et refuse les valeurs invalides', () => {
    expect(accentTone(defaultAccent).chromaScale).toBe(1);
    expect(themeColor('#18211c', defaultAccent)).toBe('#18211c');
    expect(validAccent('#aBc123')).toBe(true);
    for (const value of ['red', '#abc', '#fffffff', '', null, 12]) expect(validAccent(value)).toBe(false);
    expect(accentTone('invalid')).toEqual(accentTone(defaultAccent));
  });
  it('recolore les nuances sombres et claires sans échanger leur luminosité', () => {
    const accent = '#7050a1';
    expect(accentTone(accent).hue).not.toBe(accentTone(defaultAccent).hue);
    const dark = themeColor('#18211c', accent);
    const light = themeColor('#f7f8f3', accent);
    expect(dark).not.toBe('#18211c');
    expect(light).not.toBe('#f7f8f3');
    expect(parseInt(dark.slice(1, 3), 16)).toBeLessThan(70);
    expect(parseInt(light.slice(1, 3), 16)).toBeGreaterThan(230);
  });
  it('permet des couleurs neutres et borne la saturation des couleurs vives', () => {
    expect(accentTone('#000000').chromaScale).toBe(0);
    const gray = themeColor('#315b43', '#000000');
    expect(gray.slice(1, 3)).toBe(gray.slice(3, 5));
    expect(gray.slice(3, 5)).toBe(gray.slice(5, 7));
    expect(accentTone('#0000ff').chromaScale).toBeLessThanOrEqual(2);
    expect(themeColor('#315b43', '#0000ff')).toMatch(/^#[0-9a-f]{6}$/);
  });
});
