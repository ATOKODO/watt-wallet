import { describe, expect, it } from 'vitest';
import {
  adaptiveBounds,
  arrangeGrid,
  gridCells,
  minimumBounds,
  nearestFreeGridCell,
} from '../src/app/scene/grid';

describe('grille du diorama', () => {
  it('range des empreintes différentes avec une marge sans sortir du plateau', () => {
    const items = [
      { id: 'chauffage', width: 2.4, depth: 2.3 },
      { id: 'frigo', width: 1.3, depth: 1.1 },
      { id: 'tv', width: 1.8, depth: 0.7 },
      { id: 'four', width: 1.2, depth: 1.2 },
      { id: 'pc', width: 1.5, depth: 1.1 },
      { id: 'lampe', width: 0.6, depth: 0.6 },
    ];
    const layout = arrangeGrid(items);
    expect(layout).not.toBeNull();
    expect(layout).toHaveLength(items.length);
    for (const [index, placed] of layout!.entries()) {
      const size = items[index];
      expect(Math.abs(placed.position.x) + size.width / 2).toBeLessThanOrEqual(8);
      expect(Math.abs(placed.position.z) + size.depth / 2).toBeLessThanOrEqual(6);
      for (let other = 0; other < index; other++) {
        const previous = layout![other].position;
        const previousSize = items[other];
        const gapX = Math.abs(placed.position.x - previous.x) - (size.width + previousSize.width) / 2;
        const gapZ = Math.abs(placed.position.z - previous.z) - (size.depth + previousSize.depth) / 2;
        expect(gapX >= 0.44 || gapZ >= 0.44).toBe(true);
      }
    }
  });

  it('agrandit le plateau pour ranger trente grands appareils sans chevauchement', () => {
    const items = Array.from({ length: 30 }, (_, index) => ({ id: String(index), width: 4, depth: 4 }));
    const bounds = adaptiveBounds(items);
    const layout = arrangeGrid(items)!;
    expect(layout).toHaveLength(30);
    expect(bounds.halfWidth * bounds.halfDepth).toBeGreaterThan(8 * 6);
    for (const [index, placed] of layout.entries()) {
      expect(Math.abs(placed.position.x) + 2).toBeLessThanOrEqual(bounds.halfWidth);
      expect(Math.abs(placed.position.z) + 2).toBeLessThanOrEqual(bounds.halfDepth);
      for (const other of layout.slice(0, index)) {
        const dx = Math.abs(placed.position.x - other.position.x);
        const dz = Math.abs(placed.position.z - other.position.z);
        expect(dx >= 4.44 || dz >= 4.44).toBe(true);
      }
    }
    expect(items[0]).toEqual({ id: '0', width: 4, depth: 4 });
  });

  it('garde les positions existantes sur le plateau et retrouve la taille minimale après retrait', () => {
    const items = [{ id: 'a', width: 2, depth: 2 }];
    expect(adaptiveBounds(items, [{ id: 'a', position: { x: 24, z: -17 } }])).toEqual({
      halfWidth: 26,
      halfDepth: 19,
    });
    expect(adaptiveBounds([])).toEqual(minimumBounds);
  });

  it('limite les repères pour des positions éloignées et refuse les dimensions invalides', () => {
    const items = [{ id: 'a', width: 1, depth: 1 }];
    const bounds = adaptiveBounds(items, [{ id: 'a', position: { x: 10000, z: 10000 } }]);
    const cells = gridCells(items, bounds);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length).toBeLessThanOrEqual(4096);
    expect(arrangeGrid([{ id: 'invalid', width: Infinity, depth: 2 }])).toBeNull();
  });

  it('range les cinq cents objets autorisés avec des empreintes très allongées', () => {
    const items = Array.from({ length: 500 }, (_, index) => ({ id: String(index), width: 100, depth: 0.5 }));
    expect(arrangeGrid(items)).toHaveLength(500);
  });

  it('accroche à la cellule libre la plus proche', () => {
    const cells = gridCells([{ id: 'a', width: 2, depth: 2 }]);
    const target = cells[0];
    const free = nearestFreeGridCell(target, cells, [{ position: target, width: 2, depth: 2 }], {
      width: 2,
      depth: 2,
    });
    expect(free).not.toBeNull();
    expect(free).not.toEqual(target);
  });
});

it('évite les empreintes hors grille et conserve une marge après accrochage', () => {
  const size = { width: 4, depth: 4 };
  const cells = [
    { x: 0, z: 0 },
    { x: 4.45, z: 0 },
    { x: 8.9, z: 0 },
  ];
  const occupied = [{ position: { x: 2.225, z: 0 }, ...size }];
  const free = nearestFreeGridCell({ x: 4.45, z: 0 }, cells, occupied, size);
  expect(free).toEqual({ x: 8.9, z: 0 });
  expect(Math.abs(free!.x - occupied[0].position.x) - 4).toBeGreaterThanOrEqual(0.44);
  expect(nearestFreeGridCell({ x: 0, z: 0 }, cells.slice(0, 2), occupied, size)).toBeNull();
});
