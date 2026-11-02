const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓ0123456789";
const FONT = 16;
const COLOR_KEY = "oscp-matrix-color";
const SHELL_RAIN = "#4696ff";

const canvas = document.getElementById("matrix-rain");
const back = document.getElementById("desk-back");
const picker = document.getElementById("rain-color");
if (back) {
  const base = location.pathname.replace(/\/revshells(?:\/.*)?$/, "");
  back.href = `${base || ""}/`;
}

function hexOk(value) {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(String(value || "").trim());
  return match ? `#${match[1].toLowerCase()}` : "";
}

function parseHex(hex) {
  const safe = hexOk(hex);
  if (!safe) return null;
  return {
    r: Number.parseInt(safe.slice(1, 3), 16),
    g: Number.parseInt(safe.slice(3, 5), 16),
    b: Number.parseInt(safe.slice(5, 7), 16),
  };
}

function mix(from, to, amount) {
  const keep = 1 - amount;
  return {
    r: Math.round(from.r * keep + to.r * amount),
    g: Math.round(from.g * keep + to.g * amount),
    b: Math.round(from.b * keep + to.b * amount),
  };
}

function palette(hex) {
  const rgb = parseHex(hex) || parseHex(SHELL_RAIN);
  const head = mix(rgb, { r: 255, g: 255, b: 255 }, 0.72);
  const fade = mix(rgb, { r: 0, g: 0, b: 0 }, 0.9);
  const page = mix(rgb, { r: 0, g: 0, b: 0 }, 0.93);
  return {
    fade: `rgba(${fade.r}, ${fade.g}, ${fade.b}, 0.16)`,
    head: `rgba(${head.r}, ${head.g}, ${head.b}, 0.95)`,
    body: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.75)`,
    page: `rgb(${page.r}, ${page.g}, ${page.b})`,
  };
}

let rain = hexOk(localStorage.getItem(COLOR_KEY)) || SHELL_RAIN;
if (picker) {
  picker.value = rain;
  picker.addEventListener("input", () => {
    const next = hexOk(picker.value);
    if (!next) return;
    rain = next;
    localStorage.setItem(COLOR_KEY, next);
    document.documentElement.style.setProperty("--rain-page", palette(next).page);
  });
}
document.documentElement.style.setProperty("--rain-page", palette(rain).page);

if (canvas && canvas.getContext && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
    const paint = palette(rain);
    ctx.fillStyle = paint.fade;
    ctx.fillRect(0, 0, width, height);
    ctx.font = `${FONT}px ui-monospace, monospace`;
    for (let i = 0; i < drops.length; i++) {
      const x = i * FONT;
      const y = drops[i] * FONT;
      const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] || "0";
      ctx.fillStyle = Math.random() > 0.92 ? paint.head : paint.body;
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
