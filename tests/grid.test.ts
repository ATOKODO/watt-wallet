import { describe, expect, it } from 'vitest';
import { arrangeGrid, gridCells, nearestFreeGridCell } from '../src/app/scene/grid';

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

  it('signale le manque de place sans modifier les appareils', () => {
    const items = Array.from({ length: 30 }, (_, index) => ({ id: String(index), width: 4, depth: 4 }));
    expect(arrangeGrid(items)).toBeNull();
    expect(items[0]).toEqual({ id: '0', width: 4, depth: 4 });
  });

  it('accroche à la cellule libre la plus proche', () => {
    const cells = gridCells([{ id: 'a', width: 2, depth: 2 }]);
    const target = cells[0];
    const free = nearestFreeGridCell(target, cells, [target]);
    expect(free).not.toBeNull();
    expect(free).not.toEqual(target);
  });
});
