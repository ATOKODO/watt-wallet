export interface GridFootprint {
  id: string;
  width: number;
  depth: number;
}
export interface GridPosition {
  x: number;
  z: number;
}

const HALF_WIDTH = 8;
const HALF_DEPTH = 6;
const GAP = 0.45;

export function gridCells(items: GridFootprint[]): GridPosition[] {
  const width = Math.max(0.5, ...items.map((item) => item.width));
  const depth = Math.max(0.5, ...items.map((item) => item.depth));
  if (!Number.isFinite(width) || !Number.isFinite(depth) || width > HALF_WIDTH * 2 || depth > HALF_DEPTH * 2)
    return [];
  const stepX = width + GAP;
  const stepZ = depth + GAP;
  const columns = Math.floor((HALF_WIDTH * 2 - width) / stepX) + 1;
  const rows = Math.floor((HALF_DEPTH * 2 - depth) / stepZ) + 1;
  const cells: GridPosition[] = [];
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++)
      cells.push({
        x: (column - (columns - 1) / 2) * stepX,
        z: (row - (rows - 1) / 2) * stepZ,
      });
  return cells;
}

export function arrangeGrid(items: GridFootprint[]): { id: string; position: GridPosition }[] | null {
  if (!items.length) return [];
  const cells = gridCells(items);
  if (cells.length < items.length) return null;
  const xs = [...new Set(cells.map((cell) => cell.x))];
  const zs = [...new Set(cells.map((cell) => cell.z))];
  const width = Math.max(0.5, ...items.map((item) => item.width));
  const depth = Math.max(0.5, ...items.map((item) => item.depth));
  let best: { columns: number; rows: number; score: number } | null = null;
  for (let columns = 1; columns <= xs.length; columns++) {
    const rows = Math.ceil(items.length / columns);
    if (rows > zs.length) continue;
    const fillX = ((columns - 1) * (width + GAP) + width) / (HALF_WIDTH * 2);
    const fillZ = ((rows - 1) * (depth + GAP) + depth) / (HALF_DEPTH * 2);
    const score = Math.max(fillX, fillZ) + Math.abs(fillX - fillZ) * 0.15;
    if (!best || score < best.score) best = { columns, rows, score };
  }
  if (!best) return null;
  const startColumn = Math.floor((xs.length - best.columns) / 2);
  const startRow = Math.floor((zs.length - best.rows) / 2);
  return items.map((item, index) => ({
    id: item.id,
    position: {
      x: Number(xs[startColumn + (index % best.columns)].toFixed(2)),
      z: Number(zs[startRow + Math.floor(index / best.columns)].toFixed(2)),
    },
  }));
}

export function nearestFreeGridCell(
  point: GridPosition,
  cells: GridPosition[],
  occupied: GridPosition[],
): GridPosition | null {
  const free = cells.filter(
    (cell) => !occupied.some((position) => Math.hypot(position.x - cell.x, position.z - cell.z) < 0.05),
  );
  if (!free.length) return null;
  return free.reduce((nearest, candidate) =>
    (candidate.x - point.x) ** 2 + (candidate.z - point.z) ** 2 <
    (nearest.x - point.x) ** 2 + (nearest.z - point.z) ** 2
      ? candidate
      : nearest,
  );
}
