import { useEffect, useRef } from "react";

type Point = { x: number; y: number };
type Bolt = { points: Point[]; life: number; hue: number };

function arc(ax: number, ay: number, bx: number, by: number): Point[] {
  const points: Point[] = [{ x: ax, y: ay }];
  const steps = 8;
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    points.push({
      x: ax + (bx - ax) * t + (Math.random() - 0.5) * 90,
      y: ay + (by - ay) * t + (Math.random() - 0.5) * 36,
    });
  }
  points.push({ x: bx, y: by });
  return points;
}

/** Electrical arcs behind the AI desk. Still when motion is reduced. */
export function AiEnergy() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let alive = true;
    const bolts: Bolt[] = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function nodes() {
      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = "rgba(61, 240, 255, 0.55)";
      for (let i = 0; i < 18; i += 1) {
        const x = (width / 18) * i + 12;
        const y = height * (0.15 + ((i * 37) % 70) / 100);
        ctx!.beginPath();
        ctx!.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    resize();
    if (reduce) {
      nodes();
      const onResize = () => {
        resize();
        nodes();
      };
      window.addEventListener("resize", onResize);
      return () => {
        alive = false;
        window.removeEventListener("resize", onResize);
      };
    }

    function spawn() {
      const ax = Math.random() * width;
      const ay = Math.random() * height * 0.45;
      const bx = Math.min(width, Math.max(0, ax + (Math.random() - 0.5) * width * 0.5));
      const by = Math.min(height, ay + 70 + Math.random() * height * 0.35);
      bolts.push({ points: arc(ax, ay, bx, by), life: 1, hue: Math.random() > 0.4 ? 186 : 318 });
    }

    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 40) return;
      last = now;
      if (bolts.length < 4 && Math.random() > 0.55) spawn();
      ctx!.clearRect(0, 0, width, height);
      for (let i = bolts.length - 1; i >= 0; i -= 1) {
        const bolt = bolts[i];
        if (!bolt) continue;
        bolt.life -= 0.07;
        if (bolt.life <= 0) {
          bolts.splice(i, 1);
          continue;
        }
        ctx!.beginPath();
        bolt.points.forEach((point, index) => {
          if (index === 0) ctx!.moveTo(point.x, point.y);
          else ctx!.lineTo(point.x, point.y);
        });
        ctx!.strokeStyle = `hsla(${bolt.hue}, 100%, 68%, ${bolt.life})`;
        ctx!.lineWidth = 1.5;
        ctx!.shadowColor = `hsla(${bolt.hue}, 100%, 62%, ${bolt.life})`;
        ctx!.shadowBlur = 18;
        ctx!.stroke();
        ctx!.shadowBlur = 0;
      }
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
