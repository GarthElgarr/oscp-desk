const DB_NAME = "oscp-report-shots";
const STORE = "files";

export type StoredShot = { dataUrl: string; w: number; h: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putShot(id: string, shot: StoredShot) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(shot, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteShot(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadShots(ids: string[]): Promise<Map<string, StoredShot>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const db = await openDb();
  const pairs = await Promise.all(
    unique.map(
      (id) =>
        new Promise<[string, StoredShot | null]>((resolve, reject) => {
          const tx = db.transaction(STORE, "readonly");
          const request = tx.objectStore(STORE).get(id);
          request.onsuccess = () => {
            const value = request.result as StoredShot | undefined;
            resolve([id, value && typeof value.dataUrl === "string" ? value : null]);
          };
          request.onerror = () => reject(request.error);
        }),
    ),
  );
  db.close();
  return new Map(pairs.filter((pair): pair is [string, StoredShot] => Boolean(pair[1])));
}

export function fileToShot(file: File): Promise<StoredShot> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / img.width, 1600 / img.height);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that image."));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error("Could not read that image."));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve({ dataUrl: String(reader.result), w, h });
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.82,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

export function shotBytes(shot: StoredShot): Uint8Array {
  try {
    const prefix = "data:image/jpeg;base64,";
    if (!shot.dataUrl.startsWith(prefix)) return new Uint8Array();
    const body = shot.dataUrl.slice(prefix.length).replace(/\s/g, "");
    if (!body || !/^[A-Za-z0-9+/]+={0,2}$/.test(body)) return new Uint8Array();
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return new Uint8Array();
  }
}
