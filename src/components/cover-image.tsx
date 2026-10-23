import { useEffect, useRef, useState, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { clearCover, fileToCover, loadCover, saveCover } from "@/lib/cover-image";

export function CoverImage() {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    loadCover()
      .then((value) => {
        if (live) setSrc(value);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  async function take(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const dataUrl = await fileToCover(file);
      await saveCover(dataUrl);
      setSrc(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use that picture.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setError("");
    try {
      await clearCover();
      setSrc(null);
    } catch {
      setError("Could not remove the picture.");
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    void take(event.dataTransfer.files[0]);
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      className="sr-only"
      onChange={(event) => void take(event.target.files?.[0])}
    />
  );

  if (!src) {
    return (
      <div>
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-bg px-4 py-4 text-center"
        >
          {input}
          <ImagePlus className="size-5 text-primary" aria-hidden="true" />
          <span className="text-sm text-fg">{busy ? "Saving…" : "Add your picture"}</span>
          <span className="text-xs text-muted">JPEG, PNG, WebP, or GIF. It stays in this browser, so each person keeps their own.</span>
        </label>
        {error ? <p className="mt-2 text-sm text-dead">{error}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-lg border border-border"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <img src={src} alt="Your picture" className="h-40 w-full object-cover sm:h-52" />
        <div className="absolute right-2 bottom-2 flex gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border bg-surface/90 px-3 text-sm text-fg">
            {input}
            {busy ? "Saving…" : "Change"}
          </label>
          <button
            type="button"
            onClick={() => void remove()}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-border bg-surface/90 px-3 text-sm text-muted"
          >
            <X className="size-3.5" aria-hidden="true" />
            Remove
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-dead">{error}</p> : null}
    </div>
  );
}
