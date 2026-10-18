type Pt = [number, number];
type Tri = [Pt, Pt, Pt];

const W = 1600;
const H = 700;
const COLS = 11;
const ROWS = 5;
const CELL_W = W / COLS;
const CELL_H = H / ROWS;

interface Poly {
  cls: string;
  points: string;
}

function buildPolygons(): Poly[] {
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  const grid: Pt[][] = [];
  for (let j = 0; j <= ROWS; j += 1) {
    grid[j] = [];
    for (let i = 0; i <= COLS; i += 1) {
      const x = i * CELL_W + (i % COLS ? (rand() - 0.5) * 0.56 * CELL_W : 0);
      const y = j * CELL_H + (j % ROWS ? (rand() - 0.5) * 0.56 * CELL_H : 0);
      grid[j][i] = [x, y];
    }
  }

  const polys: Poly[] = [];
  for (let j = 0; j < ROWS; j += 1) {
    for (let i = 0; i < COLS; i += 1) {
      const a = grid[j][i];
      const b = grid[j][i + 1];
      const c = grid[j + 1][i + 1];
      const d = grid[j + 1][i];
      const triangles: Tri[] =
        rand() < 0.5
          ? [
              [a, b, c],
              [a, c, d],
            ]
          : [
              [a, b, d],
              [b, c, d],
            ];
      triangles.forEach((tri) => {
        const x = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
        const y = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const dist = Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2));
        const step = Math.min(4, Math.max(0, Math.floor(dist * 3.2 + (rand() - 0.5) * 1.8)));
        let cls = `p${step}`;
        if (dist > 0.8 && rand() < 0.14) cls = "pa";
        polys.push({
          cls,
          points: tri
            .map((p) => `${Math.round(p[0])},${Math.round(p[1])}`)
            .join(" "),
        });
      });
    }
  }

  return polys;
}

const POLYGONS = buildPolygons();

export default function HeroPolygons() {
  return (
    <div className="lp-poly" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        {POLYGONS.map((poly, index) => (
          <polygon key={index} className={poly.cls} points={poly.points} />
        ))}
      </svg>
    </div>
  );
}
