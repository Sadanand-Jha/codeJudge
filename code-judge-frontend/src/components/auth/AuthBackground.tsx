const VIEW_W = 1600;
const VIEW_H = 1000;
const COLS = 9;
const ROWS = 6;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261017);

const jitter = (base: number, amount: number) => base + (rand() * 2 - 1) * amount;

const cw = VIEW_W / COLS;
const ch = VIEW_H / ROWS;

const px: number[][] = [];
for (let r = 0; r <= ROWS; r++) {
  const row: number[] = [];
  for (let c = 0; c <= COLS; c++) {
    const x = c === 0 || c === COLS ? c * cw : jitter(c * cw, cw * 0.3);
    const y = r === 0 || r === ROWS ? r * ch : jitter(r * ch, ch * 0.3);
    row.push(x, y);
  }
  px.push(row);
}

const point = (r: number, c: number) => `${px[r][c * 2].toFixed(1)},${px[r][c * 2 + 1].toFixed(1)}`;

const WEIGHTS = [0.3, 0.58, 0.8, 0.92, 1];

function pickPalette() {
  const roll = rand();
  for (let i = 0; i < WEIGHTS.length; i++) {
    if (roll <= WEIGHTS[i]) return i + 1;
  }
  return 1;
}

const triangles: { points: string; fill: string }[] = [];

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const mx = jitter((c + 0.5) * cw, cw * 0.26);
    const my = jitter((r + 0.5) * ch, ch * 0.26);
    const m = `${mx.toFixed(1)},${my.toFixed(1)}`;
    const tl = point(r, c);
    const tr = point(r, c + 1);
    const br = point(r + 1, c + 1);
    const bl = point(r + 1, c);
    triangles.push({ points: `${tl} ${tr} ${m}`, fill: `var(--qs-poly-${pickPalette()})` });
    triangles.push({ points: `${tr} ${br} ${m}`, fill: `var(--qs-poly-${pickPalette()})` });
    triangles.push({ points: `${br} ${bl} ${m}`, fill: `var(--qs-poly-${pickPalette()})` });
    triangles.push({ points: `${bl} ${tl} ${m}`, fill: `var(--qs-poly-${pickPalette()})` });
  }
}

export default function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width={VIEW_W} height={VIEW_H} fill="var(--qs-poly-0)" />
        {triangles.map((tri, i) => (
          <polygon key={i} points={tri.points} fill={tri.fill} />
        ))}
      </svg>
    </div>
  );
}
