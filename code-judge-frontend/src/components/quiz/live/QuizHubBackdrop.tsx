type Pt = [number, number];
type Tri = [Pt, Pt, Pt];

const W = 1600;
const H = 900;
const COLS = 11;
const ROWS = 6;
const CELL_W = W / COLS;
const CELL_H = H / ROWS;

interface Poly {
  cls: string;
  points: string;
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPolygons(): Poly[] {
  const rand = mulberry32(11);

  const grid: Pt[][] = [];
  for (let j = 0; j <= ROWS; j += 1) {
    grid[j] = [];
    for (let i = 0; i <= COLS; i += 1) {
      let x = i * CELL_W;
      let y = j * CELL_H;
      if (i > 0 && i < COLS) x += (rand() - 0.5) * 0.56 * CELL_W;
      if (j > 0 && j < ROWS) y += (rand() - 0.5) * 0.56 * CELL_H;
      grid[j][i] = [x, y];
    }
  }

  const triangles: Tri[] = [];
  for (let j = 0; j < ROWS; j += 1) {
    for (let i = 0; i < COLS; i += 1) {
      const a = grid[j][i];
      const b = grid[j][i + 1];
      const c = grid[j + 1][i + 1];
      const d = grid[j + 1][i];
      if (rand() < 0.5) {
        triangles.push([a, b, c], [a, c, d]);
      } else {
        triangles.push([a, b, d], [b, c, d]);
      }
    }
  }

  const distance = triangles.map((tri) => {
    const x = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
    const y = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
    const dx = (x - W / 2) / (W / 2);
    const dy = (y - H / 2) / (H / 2);
    return Math.min(1, Math.sqrt(dx * dx + dy * dy) / 1.1);
  });

  const edge = distance
    .map((value, index) => (value > 0.78 ? index : -1))
    .filter((index) => index >= 0);
  const accents = new Set<number>();
  while (accents.size < 4 && edge.length > 0) {
    accents.add(edge.splice(Math.floor(rand() * edge.length), 1)[0]);
  }

  return triangles.map((tri, index) => {
    const step = Math.max(
      0,
      Math.min(4, Math.round(distance[index] * 4 + (rand() - 0.5) * 1.2))
    );
    return {
      cls: accents.has(index) ? "qzba" : `qzb${step}`,
      points: tri.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" "),
    };
  });
}

const POLYGONS = buildPolygons();

export default function QuizHubBackdrop() {
  return (
    <div className="quiz-hub-bg" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        {POLYGONS.map((poly, index) => (
          <polygon key={index} className={poly.cls} points={poly.points} />
        ))}
      </svg>
    </div>
  );
}
