const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓ0123456789";
const FONT = 16;

const canvas = document.getElementById("matrix-rain");
const back = document.getElementById("desk-back");
if (back) {
  const base = location.pathname.replace(/\/revshells(?:\/.*)?$/, "");
  back.href = `${base || ""}/`;
}

if (canvas && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let drops = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.ceil(width / FONT);
    drops = Array.from({ length: count }, () => Math.random() * (height / FONT));
  }

  function draw() {
    ctx.fillStyle = "rgba(4, 10, 28, 0.18)";
    ctx.fillRect(0, 0, width, height);
    ctx.font = `${FONT}px ui-monospace, monospace`;
    for (let i = 0; i < drops.length; i++) {
      const x = i * FONT;
      const y = drops[i] * FONT;
      const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] || "0";
      ctx.fillStyle = Math.random() > 0.92 ? "rgba(220, 240, 255, 0.95)" : "rgba(70, 150, 255, 0.75)";
      ctx.fillText(glyph, x, y);
      drops[i] += 1;
      if (y > height && Math.random() > 0.975) drops[i] = 0;
    }
  }

  resize();
  let last = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    if (document.hidden || now - last < 50) return;
    last = now;
    draw();
  };
  requestAnimationFrame(loop);
  window.addEventListener("resize", resize);
}
