import { useSyncExternalStore } from "react";
import { DESK_RAIN, getMatrixColor, getMatrixColorServer, setMatrixColor, subscribeMatrixColor } from "@/lib/matrix-color";

export function RainColor() {
  const chosen = useSyncExternalStore(subscribeMatrixColor, getMatrixColor, getMatrixColorServer);
  return (
    <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted" title="Colour of the falling code">
      <span className="font-mono text-xs tracking-wide">Rain</span>
      <input
        type="color"
        aria-label="Rain colour"
        value={chosen || DESK_RAIN}
        onChange={(event) => setMatrixColor(event.target.value)}
        className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"
      />
    </label>
  );
}
