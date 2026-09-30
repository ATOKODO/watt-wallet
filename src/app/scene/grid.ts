export interface GridFootprint {
  id: string;
  width: number;
  depth: number;
}
export interface GridPosition {
  x: number;
  z: number;
}
export interface GridBounds {
  halfWidth: number;
  halfDepth: number;
}

export const minimumBounds: GridBounds = { halfWidth: 8, halfDepth: 6 };
const GAP = 0.45;
const EDGE = 0.5;
const MAX_CELLS = 4096;

function cellSize(items: GridFootprint[]) {
  if (
    !items.every(
      (item) =>
        Number.isFinite(item.width) && item.width >= 0 && Number.isFinite(item.depth) && item.depth >= 0,
    )
  )
    return null;
  return {
    width: Math.max(0.5, ...items.map((item) => item.width)),
    depth: Math.max(0.5, ...items.map((item) => item.depth)),
  };
}

export function adaptiveBounds(
  items: GridFootprint[],
  positions: { id: string; position: GridPosition }[] = [],
): GridBounds {
  const size = cellSize(items);
  if (!size) return { ...minimumBounds };
  let best = { width: 0, depth: 0, score: Infinity };
  for (let columns = 1; columns <= items.length; columns++) {
    const rows = Math.ceil(items.length / columns);
    const width = columns * (size.width + GAP) - GAP;
    const depth = rows * (size.depth + GAP) - GAP;
    const fillX = width / 16,
      fillZ = depth / 12;
    const score = Math.max(fillX, fillZ) + Math.abs(fillX - fillZ) * 0.15;
    if (score < best.score) best = { width, depth, score };
  }
  let halfWidth = Math.max(minimumBounds.halfWidth, best.width / 2 + EDGE);
  let halfDepth = Math.max(minimumBounds.halfDepth, best.depth / 2 + EDGE);
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const { id, position } of positions) {
    const item = byId.get(id);
    if (!item || !Number.isFinite(position.x) || !Number.isFinite(position.z)) continue;
    halfWidth = Math.max(halfWidth, Math.abs(position.x) + item.width / 2 + EDGE);
    halfDepth = Math.max(halfDepth, Math.abs(position.z) + item.depth / 2 + EDGE);
  }
  return { halfWidth: Math.ceil(halfWidth), halfDepth: Math.ceil(halfDepth) };
}

export function gridCells(items: GridFootprint[], bounds = adaptiveBounds(items)): GridPosition[] {
  const size = cellSize(items);
  if (
    !size ||
    !Number.isFinite(bounds.halfWidth) ||
    !Number.isFinite(bounds.halfDepth) ||
    size.width > bounds.halfWidth * 2 ||
    size.depth > bounds.halfDepth * 2
  )
    return [];
  const { width, depth } = size;
  let columns = Math.floor((bounds.halfWidth * 2 - width) / (width + GAP)) + 1;
  let rows = Math.floor((bounds.halfDepth * 2 - depth) / (depth + GAP)) + 1;
  const rawColumns = columns,
    rawRows = rows;
  // A distant imported position must not allocate millions of GPU grid markers.
  if (columns * rows > MAX_CELLS) {
    const reduction = Math.sqrt((columns * rows) / MAX_CELLS);
    columns = Math.max(1, Math.floor(columns / reduction));
    rows = Math.max(1, Math.floor(rows / reduction));
    columns = Math.min(columns, MAX_CELLS);
    rows = Math.min(rows, Math.floor(MAX_CELLS / columns));
  }
  const stepX =
    columns < rawColumns && columns > 1 ? (bounds.halfWidth * 2 - width) / (columns - 1) : width + GAP;
  const stepZ = rows < rawRows && rows > 1 ? (bounds.halfDepth * 2 - depth) / (rows - 1) : depth + GAP;
  const cells: GridPosition[] = [];
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++)
      cells.push({
        x: (column - (columns - 1) / 2) * stepX,
        z: (row - (rows - 1) / 2) * stepZ,
      });
  return cells;
}

export function arrangeGrid(
  items: GridFootprint[],
  bounds = adaptiveBounds(items),
): { id: string; position: GridPosition }[] | null {
  if (!items.length) return [];
  const cells = gridCells(items, bounds);
  if (cells.length < items.length) return null;
  const xs = [...new Set(cells.map((cell) => cell.x))];
  const zs = [...new Set(cells.map((cell) => cell.z))];
  const size = cellSize(items)!;
  const stepX = xs.length > 1 ? xs[1] - xs[0] : size.width + GAP;
  const stepZ = zs.length > 1 ? zs[1] - zs[0] : size.depth + GAP;
  let best: { columns: number; rows: number; score: number } | null = null;
  for (let columns = 1; columns <= xs.length; columns++) {
    const rows = Math.ceil(items.length / columns);
    if (rows > zs.length) continue;
    const fillX = ((columns - 1) * stepX + size.width) / 16;
    const fillZ = ((rows - 1) * stepZ + size.depth) / 12;
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
