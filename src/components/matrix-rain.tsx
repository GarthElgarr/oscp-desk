import { useEffect, useRef } from "react";

const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓ0123456789";
const FONT = 16;
const COLUMN = 72 * 16;

/** Falling glyphs in the empty margins. The centre column is left clear. */
export function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let drops: number[] = [];
    let alive = true;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.ceil(width / FONT);
      drops = Array.from({ length: count }, () => Math.random() * (height / FONT));
    }

    function draw() {
      if (!alive) return;
      const band = Math.min(width, COLUMN);
      const left = (width - band) / 2;
      const right = left + band;
      ctx!.fillStyle = "rgba(16, 20, 16, 0.14)";
      ctx!.fillRect(0, 0, left, height);
      ctx!.fillRect(right, 0, width - right, height);
      ctx!.font = `${FONT}px "IBM Plex Mono", ui-monospace, monospace`;
      for (let i = 0; i < drops.length; i++) {
        const x = i * FONT;
        if (x + FONT > left && x < right) continue;
        const y = drops[i] * FONT;
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "0";
        ctx!.fillStyle = Math.random() > 0.92 ? "rgba(214, 245, 214, 0.95)" : "rgba(90, 168, 120, 0.7)";
        ctx!.fillText(glyph, x, y);
        drops[i] += 1;
        if (y > height && Math.random() > 0.975) drops[i] = 0;
      }
    }

    resize();
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 50) return;
      last = now;
      draw();
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
