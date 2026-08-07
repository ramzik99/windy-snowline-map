export type GridPoint = {
  lat: number;
  lon: number;
  value: number | null;
};

export type ContourSegment = [[number, number], [number, number]];

function interp(
  p1: [number, number],
  p2: [number, number],
  v1: number,
  v2: number,
  level: number
): [number, number] {
  if (Math.abs(v2 - v1) < 1e-9) {
    return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  }

  const f = (level - v1) / (v2 - v1);
  return [
    p1[0] + f * (p2[0] - p1[0]),
    p1[1] + f * (p2[1] - p1[1]),
  ];
}

/**
 * Marching-squares line segments for one contour level.
 * Grid is rows x cols; rows increase northward and columns eastward.
 */
export function contourSegments(
  grid: GridPoint[][],
  level: number
): ContourSegment[] {
  const out: ContourSegment[] = [];

  for (let r = 0; r < grid.length - 1; r++) {
    for (let c = 0; c < grid[r].length - 1; c++) {
      const sw = grid[r][c];
      const se = grid[r][c + 1];
      const nw = grid[r + 1][c];
      const ne = grid[r + 1][c + 1];

      if (
        sw.value === null ||
        se.value === null ||
        ne.value === null ||
        nw.value === null
      ) continue;

      const v = [sw.value, se.value, ne.value, nw.value];
      const p: [number, number][] = [
        [sw.lat, sw.lon],
        [se.lat, se.lon],
        [ne.lat, ne.lon],
        [nw.lat, nw.lon],
      ];

      // Edges: 0 bottom SW-SE, 1 right SE-NE, 2 top NE-NW, 3 left NW-SW
      const edgePoint = (edge: number): [number, number] => {
        switch (edge) {
          case 0: return interp(p[0], p[1], v[0], v[1], level);
          case 1: return interp(p[1], p[2], v[1], v[2], level);
          case 2: return interp(p[2], p[3], v[2], v[3], level);
          default: return interp(p[3], p[0], v[3], v[0], level);
        }
      };

      let code = 0;
      if (v[0] >= level) code |= 1;
      if (v[1] >= level) code |= 2;
      if (v[2] >= level) code |= 4;
      if (v[3] >= level) code |= 8;

      const table: Record<number, number[][]> = {
        0: [],
        1: [[3, 0]],
        2: [[0, 1]],
        3: [[3, 1]],
        4: [[1, 2]],
        5: [[3, 2], [0, 1]],
        6: [[0, 2]],
        7: [[3, 2]],
        8: [[2, 3]],
        9: [[0, 2]],
        10: [[0, 3], [1, 2]],
        11: [[1, 2]],
        12: [[1, 3]],
        13: [[0, 1]],
        14: [[3, 0]],
        15: [],
      };

      for (const pair of table[code]) {
        out.push([edgePoint(pair[0]), edgePoint(pair[1])]);
      }
    }
  }

  return out;
}
