import React, { useEffect, useMemo, useRef, useState } from "react";

// --- Utility types ---
type Pt = { x: number; y: number; id: string };

type Pair = { i: number; j: number };

type StepInfo = {
  pair: Pair;
  A: Pt; B: Pt;
  dx: number; dy: number;
  ldx: number; ldy: number; // +90°
  rdx: number; rdy: number; // -90°
  C: Pt; D: Pt;             // left-rotation candidates
  C2: Pt; D2: Pt;           // right-rotation candidates
  leftOK: boolean; rightOK: boolean;
  newlyAddedSquares: string[]; // normalized keys added on this step
  uniqueCount: number;
};

// --- Sample datasets ---
const axisAligned: Pt[] = [
  { x: 1, y: 1, id: "P0" },
  { x: 3, y: 1, id: "P1" },
  { x: 3, y: 3, id: "P2" },
  { x: 1, y: 3, id: "P3" },
  { x: 6, y: 3, id: "P4" }, // rotated square
  { x: 7, y: 2, id: "P5" },
  { x: 6, y: 1, id: "P6" },
  { x: 5, y: 2, id: "P7" },
  { x: 0, y: 0, id: "P8" }, // distractors
  { x: 4, y: 0, id: "P9" },
  { x: 8, y: 3, id: "P10" },
  { x: 2, y: 4, id: "P11" },
];

// Helpers
const keyOf = (p: { x: number; y: number }) => `${p.x},${p.y}`;
const normalizeSquareKey = (pts: { x: number; y: number }[]) =>
  pts
    .map((p) => keyOf(p))
    .sort()
    .join("|");

// Rotation by +90°: (-dy, dx), by -90°: (dy, -dx)
const rotLeft = (dx: number, dy: number) => ({ x: -dy, y: dx });
const rotRight = (dx: number, dy: number) => ({ x: dy, y: -dx });

// --- Main component ---
export default function InteractiveSquareFinder() {
  const [points, setPoints] = useState<Pt[]>(axisAligned);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(900); // ms per step
  const [step, setStep] = useState(0);
  const uniqueSquaresRef = useRef<Set<string>>(new Set());
  const seenUpToRef = useRef<number>(-1);

  // Build O(n^2) pair list once for current point set
  const pairs = useMemo<Pair[]>(() => {
    const ps: Pair[] = [];
    for (let i = 0; i < points.length; i++)
      for (let j = i + 1; j < points.length; j++) ps.push({ i, j });
    return ps;
  }, [points]);

  // Quick membership set for O(1) lookups
  const membership = useMemo(() => {
    const s = new Set<string>();
    points.forEach((p) => s.add(keyOf(p)));
    return s;
  }, [points]);

  // Compute info for one step (pure function)
  const computeStep = (k: number, carrySquares: Set<string>, alreadySeenIndex: number): StepInfo => {
    const { i, j } = pairs[k];
    const A = points[i];
    const B = points[j];
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const L = rotLeft(dx, dy); // (+90°)
    const R = rotRight(dx, dy); // (-90°)
    const C = { x: A.x + L.x, y: A.y + L.y, id: "C" };
    const D = { x: B.x + L.x, y: B.y + L.y, id: "D" };
    const C2 = { x: A.x + R.x, y: A.y + R.y, id: "C'" };
    const D2 = { x: B.x + R.x, y: B.y + R.y, id: "D'" };

    const leftOK = membership.has(keyOf(C)) && membership.has(keyOf(D));
    const rightOK = membership.has(keyOf(C2)) && membership.has(keyOf(D2));

    const newly: string[] = [];
    if (leftOK) {
      const k1 = normalizeSquareKey([A, B, C, D]);
      if (!carrySquares.has(k1)) {
        carrySquares.add(k1);
        newly.push(k1);
      }
    }
    if (rightOK) {
      const k2 = normalizeSquareKey([A, B, C2, D2]);
      if (!carrySquares.has(k2)) {
        carrySquares.add(k2);
        newly.push(k2);
      }
    }

    // If we rewound (k <= alreadySeenIndex), recompute set from scratch up to k
    if (k <= alreadySeenIndex) {
      carrySquares.clear();
      for (let t = 0; t <= k; t++) {
        const tmp = computeStepOnce(t);
        tmp.newlyAddedSquares.forEach((s) => carrySquares.add(s));
      }
    }

    return {
      pair: { i, j },
      A, B,
      dx, dy,
      ldx: L.x, ldy: L.y,
      rdx: R.x, rdy: R.y,
      C, D, C2, D2,
      leftOK, rightOK,
      newlyAddedSquares: newly,
      uniqueCount: carrySquares.size,
    };
  };

  // Helper used when rebuilding squares up to a step index
  const computeStepOnce = (k: number): StepInfo => {
    const tmpSet = new Set<string>();
    return computeStep(k, tmpSet, -1);
  };

  // Materialize the current step info
  const info = useMemo<StepInfo>(() => {
    const setClone = new Set(uniqueSquaresRef.current);
    const result = computeStep(step, setClone, seenUpToRef.current);
    // Do not mutate the live set here; it's applied on tick/step handlers
    return result;
  }, [step, points]);

  // Playback
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      nextStep();
    }, Math.max(120, speed));
    return () => clearInterval(id);
  }, [playing, speed, step, points]);

  const nextStep = () => {
    // Apply the compute to the canonical set
    const res = computeStep(step, uniqueSquaresRef.current, seenUpToRef.current);
    seenUpToRef.current = Math.max(seenUpToRef.current, step);
    setStep((s) => (s + 1) % pairs.length);
  };

  const prevStep = () => {
    setStep((s) => (s - 1 + pairs.length) % pairs.length);
  };

  const reset = () => {
    setPlaying(false);
    setStep(0);
    uniqueSquaresRef.current = new Set();
    seenUpToRef.current = -1;
  };

  // --- Rendering ---
  const { minX, maxX, minY, maxY } = useMemo(() => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return {
      minX: Math.min(...xs) - 1.5,
      maxX: Math.max(...xs) + 1.5,
      minY: Math.min(...ys) - 1.5,
      maxY: Math.max(...ys) + 1.5,
    };
  }, [points]);

  const width = 720, height = 520;
  const toSvg = (p: { x: number; y: number }) => ({
    cx: ((p.x - minX) / (maxX - minX)) * width,
    cy: height - ((p.y - minY) / (maxY - minY)) * height,
  });

  const drawLine = (p: { x: number; y: number }, q: { x: number; y: number }) => {
    const P = toSvg(p), Q = toSvg(q);
    return <line x1={P.cx} y1={P.cy} x2={Q.cx} y2={Q.cy} strokeWidth={3} />;
  };

  const SquarePath: React.FC<{ A: Pt; B: Pt; C: { x: number; y: number }; D: { x: number; y: number } }>
    = ({ A, B, C, D }) => {
      const a = toSvg(A), b = toSvg(B), c = toSvg(C), d = toSvg(D);
      const dAttr = `M ${a.cx} ${a.cy} L ${b.cx} ${b.cy} L ${d.cx} ${d.cy} L ${c.cx} ${c.cy} Z`;
      return <path d={dAttr} strokeWidth={5} fill="none" />;
    };

  const gridLines = () => {
    const lines = [] as JSX.Element[];
    for (let x = Math.ceil(minX); x <= Math.floor(maxX); x++) {
      const px = ((x - minX) / (maxX - minX)) * width;
      lines.push(<line key={`vx${x}`} x1={px} y1={0} x2={px} y2={height} strokeDasharray="4 4" />);
    }
    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
      const py = height - ((y - minY) / (maxY - minY)) * height;
      lines.push(<line key={`hz${y}`} x1={0} y1={py} x2={width} y2={py} strokeDasharray="4 4" />);
    }
    return lines;
  };

  // Lines to highlight in the Java block for this step
  const highlightLines = useMemo(() => {
    // We highlight: set creation [H1], hits [L8,L10], the for-loops [L1,L3], dx/dy [L5], candidates [L7,L9]
    return new Set<number>([1, 8, 10, 12, 14, 16, 18]);
  }, [step]);

  return (
    <div className="w-full p-4 md:p-6 lg:p-8 font-sans">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">Interactive Square Finder</h1>
      <p className="text-sm md:text-base mb-4 max-w-3xl">
        The algorithm checks each pair (A,B), treats AB as a candidate edge, and uses 90° rotations of the edge vector to
        locate the other two corners. If both rotated candidates exist in the set, a square is found. Everything is integer
        math: <span className="font-mono">R(+90°)·(dx,dy)=(-dy,dx)</span>, <span className="font-mono">R(-90°)·(dx,dy)=(dy,-dx)</span>.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: SVG board */}
        <div className="rounded-2xl shadow p-3 bg-white">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[420px] md:h-[520px]">
            <g stroke="#e5e7eb">{gridLines()}</g>

            {/* Current edge AB */}
            <g stroke="#111827">{drawLine(info.A, info.B)}</g>

            {/* Candidates: present = X marker, missing = hollow circle */}
            <g>
              {[info.C, info.D, info.C2, info.D2].map((p, idx) => {
                const { cx, cy } = toSvg(p);
                const present = membership.has(keyOf(p));
                return present ? (
                  <g key={`cand${idx}`}>
                    <line x1={cx - 9} y1={cy - 9} x2={cx + 9} y2={cy + 9} strokeWidth={2} />
                    <line x1={cx - 9} y1={cy + 9} x2={cx + 9} y2={cy - 9} strokeWidth={2} />
                  </g>
                ) : (
                  <circle key={`cand${idx}`} cx={cx} cy={cy} r={9} fill="none" strokeWidth={2} />
                );
              })}
            </g>

            {/* Squares found this step */}
            <g stroke="#7c3aed">
              {info.leftOK && info.newlyAddedSquares.includes(normalizeSquareKey([info.A, info.B, info.C, info.D])) && (
                <SquarePath A={info.A} B={info.B} C={info.C} D={info.D} />
              )}
              {info.rightOK && info.newlyAddedSquares.includes(normalizeSquareKey([info.A, info.B, info.C2, info.D2])) && (
                <SquarePath A={info.A} B={info.B} C={info.C2} D={info.D2} />
              )}
            </g>

            {/* Draw all points */}
            <g>
              {points.map((p) => {
                const { cx, cy } = toSvg(p);
                return (
                  <g key={p.id}>
                    <circle cx={cx} cy={cy} r={6} />
                    <text x={cx + 8} y={cy - 8} className="text-xs" style={{ fontSize: 12 }}>
                      {p.id}({p.x},{p.y})
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Controls */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="px-3 py-1.5 rounded-xl shadow bg-black text-white" onClick={() => setPlaying((v) => !v)}>
              {playing ? "Pause" : "Play"}
            </button>
            <button className="px-3 py-1.5 rounded-xl shadow bg-gray-800 text-white" onClick={() => nextStep()}>Step ▶</button>
            <button className="px-3 py-1.5 rounded-xl shadow bg-gray-200" onClick={prevStep}>◀ Prev</button>
            <button className="px-3 py-1.5 rounded-xl shadow bg-gray-200" onClick={reset}>Reset</button>
            <div className="flex items-center gap-2 ml-2">
              <label className="text-sm">Speed</label>
              <input type="range" min={150} max={1500} value={speed} onChange={(e) => setSpeed(+e.target.value)} />
            </div>
            <div className="ml-auto text-sm">Pair {step + 1}/{pairs.length} • Unique squares: <b>{info.uniqueCount}</b></div>
          </div>
        </div>

        {/* Right: Math + Java walkthrough */}
        <div className="rounded-2xl shadow p-4 bg-white space-y-4">
          <h2 className="text-xl font-semibold">Math for current pair</h2>
          <div className="font-mono text-sm leading-6 bg-gray-50 rounded-xl p-3">
            <div>A = {info.A.id}({info.A.x},{info.A.y}), B = {info.B.id}({info.B.x},{info.B.y})</div>
            <div>v = AB = (dx,dy) = ({info.dx},{info.dy})</div>
            <div>R(+90°)·v = (-dy, dx) = ({info.ldx},{info.ldy})</div>
            <div>C = A + R(+90°)·v = ({info.C.x},{info.C.y}), D = B + R(+90°)·v = ({info.D.x},{info.D.y})</div>
            <div>R(-90°)·v = (dy, -dx) = ({info.rdx},{info.rdy})</div>
            <div>C' = A + R(-90°)·v = ({info.C2.x},{info.C2.y}), D' = B + R(-90°)·v = ({info.D2.x},{info.D2.y})</div>
            <div>Found (left/right): {String(info.leftOK)}/{String(info.rightOK)}</div>
          </div>

          <h2 className="text-xl font-semibold">Java code (count squares)</h2>
          <JavaBlock highlightLines={highlightLines} />

          <p className="text-sm text-gray-700">
            <b>Line-by-line:</b> We build a <span className="font-mono">HashSet</span> of points for O(1) membership (H1). For every pair (L1-L4) we
            compute <span className="font-mono">dx,dy</span> (L5). Rotating by ±90° (L7,L9) yields candidates. If both are present, we increment hits
            (L8,L10). Each physical square is discovered via its 4 edges, so we divide by 4 (L11). All arithmetic is integer-based.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Java block with contextual highlighting and math annotations ---
function JavaBlock({ highlightLines }: { highlightLines: Set<number> }) {
  const code = `static final class P {\n    final int x, y;\n    P(int x, int y){ this.x=x; this.y=y; }\n    @Override public boolean equals(Object o){ if(!(o instanceof P)) return false; P p=(P)o; return x==p.x && y==p.y; }\n    @Override public int hashCode(){ return 31*x + y; }\n}\n\n/* Math reference used below\n   v = AB = (dx,dy) = (b.x-a.x, b.y-a.y)\n   R(+90°) = [[0,-1],[1,0]]  => R(+90°)·v = (-dy, dx)\n   R(-90°) = [[0, 1],[-1,0]] => R(-90°)·v = ( dy,-dx)\n   C  = A + R(+90°)·v,  D  = B + R(+90°)·v\n   C' = A + R(-90°)·v, D' = B + R(-90°)·v\n*/\n\npublic static int countSquares(List<P> pts) {\n    Set<P> S = new HashSet<>(pts);                 // [H1] Build membership set: O(1) contains()\n    long hits = 0;                                  // [H2] Raw hits (each square counts 4 times)\n\n    for (int i = 0; i < pts.size(); i++) {         // [L1] For each A\n        P a = pts.get(i);                          // [L2]\n        for (int j = i + 1; j < pts.size(); j++) { // [L3] For each B (i<j) — each unordered pair once\n            P b = pts.get(j);                      // [L4]\n\n            // Edge vector v = AB = (dx,dy) — this is the side of a potential square\n            int dx = b.x - a.x, dy = b.y - a.y;    // [L5] v = (dx,dy)\n            if (dx == 0 && dy == 0) continue;      // [L6] Skip duplicate points\n\n            // --- Left turn (+90°): R(+90°)·v = (-dy, dx) ---\n            // C = A + R(+90°)·v => (a.x - dy, a.y + dx)\n            // D = B + R(+90°)·v => (b.x - dy, b.y + dx)\n            P c1 = new P(a.x - dy, a.y + dx),      // [L7] C = A + R(+90°)·v\n              d1 = new P(b.x - dy, b.y + dx);      //      D = B + R(+90°)·v\n            if (S.contains(c1) && S.contains(d1))  // [L8] Both corners exist => left-rotated square\n                hits++;\n\n            // --- Right turn (-90°): R(-90°)·v = (dy, -dx) ---\n            // C' = A + R(-90°)·v => (a.x + dy, a.y - dx)\n            // D' = B + R(-90°)·v => (b.x + dy, b.y - dx)\n            P c2 = new P(a.x + dy, a.y - dx),      // [L9] C' = A + R(-90°)·v\n              d2 = new P(b.x + dy, b.y - dx);      //      D' = B + R(-90°)·v\n            if (S.contains(c2) && S.contains(d2))  // [L10] Both corners exist => right-rotated square\n                hits++;\n        }\n    }\n\n    // Each geometric square is seen once per edge (4 edges)\n    return (int)(hits / 4);                         // [L11] unique squares\n}`;

  const lines = code.split("\n");
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-auto text-xs leading-5">
      {lines.map((ln, idx) => (
        <div key={idx} className={highlightLines.has(idx + 1) ? "bg-gray-800" : ""}>
          <span className="text-gray-500 select-none pr-2">{String(idx + 1).padStart(3, " ")}</span>
          <span>{ln}</span>
        </div>
      ))}
    </pre>
  );
}
