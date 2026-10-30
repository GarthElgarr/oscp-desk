import { useEffect, useRef, useState, type PointerEvent as ReactPointer, type ReactNode } from "react";

const KEY = "oscp-term-box-v1";

type Box = { w: number; h: number };

function readBox(): Box | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "") as Partial<Box>;
    if (!parsed || typeof parsed.h !== "number" || parsed.h < 160) return null;
    return { w: typeof parsed.w === "number" && parsed.w >= 280 ? parsed.w : 0, h: parsed.h };
  } catch {
    return null;
  }
}

/** A black output box. Drag the corner to change the width and the height. The size is remembered. */
export function TermBox({ children, className, onResize }: { children: ReactNode; className?: string; onResize?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onResizeRef = useRef(onResize);
  const [box, setBox] = useState<Box | null>(null);
  onResizeRef.current = onResize;

  useEffect(() => {
    setBox(readBox());
    const onStore = (event: Event) => {
      const detail = (event as CustomEvent<Box>).detail;
      if (!detail || detail.h < 160) return;
      setBox(detail);
    };
    window.addEventListener("oscp-term-box", onStore);
    return () => window.removeEventListener("oscp-term-box", onStore);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new ResizeObserver(() => onResizeRef.current?.());
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  function onPointerDown(event: ReactPointer<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const boxNode = ref.current;
    if (!boxNode) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const startW = boxNode.offsetWidth;
    const startH = boxNode.offsetHeight;
    const maxW = boxNode.parentElement?.clientWidth || startW;
    function move(next: PointerEvent) {
      const live = ref.current;
      if (!live) return;
      const w = Math.min(Math.max(280, maxW), Math.max(280, startW + next.clientX - startX));
      const h = Math.min(window.innerHeight * 0.85, Math.max(160, startH + next.clientY - startY));
      live.style.width = `${w}px`;
      live.style.height = `${h}px`;
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const live = ref.current;
      if (!live) return;
      const saved = { w: live.offsetWidth, h: live.offsetHeight };
      localStorage.setItem(KEY, JSON.stringify(saved));
      window.dispatchEvent(new CustomEvent("oscp-term-box", { detail: saved }));
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      ref={ref}
      style={{
        height: box?.h ?? 384,
        width: box?.w ? box.w : "100%",
        maxWidth: "100%",
        minWidth: 280,
        minHeight: 160,
        maxHeight: "85vh",
      }}
      className={"relative " + (className ?? "")}
    >
      <div className="h-full w-full overflow-auto">{children}</div>
      <button
        type="button"
        aria-label="Drag to resize the terminal"
        title="Drag to resize"
        onPointerDown={onPointerDown}
        className="absolute right-0 bottom-0 z-10 size-4 cursor-nwse-resize border-r-2 border-b-2 border-[#d6f5d6]/70 bg-transparent"
      />
    </div>
  );
}
