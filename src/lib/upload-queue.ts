// Upload resilience (task 004 §4.3): fetch gagal → simpan blob ke IndexedDB →
// auto-retry saat online kembali. Idempotency via client_upload_id yang sama
// (server dedup → tidak ada foto duplikat). Client-only module.

export type PendingUpload = {
  clientUploadId: string;
  eventId: string;
  tableId: string;
  width?: number;
  height?: number;
  imageBlob: Blob;
  thumbBlob: Blob | null;
};

const DB_NAME = "temora-uploads";
const STORE = "pending";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "clientUploadId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export function queuePendingUpload(item: PendingUpload): Promise<void> {
  return withStore("readwrite", (store) => store.put(item)).then(() => undefined);
}

export function getPendingUploads(): Promise<PendingUpload[]> {
  return withStore<PendingUpload[]>("readonly", (store) => store.getAll());
}

export function removePendingUpload(clientUploadId: string): Promise<void> {
  return withStore("readwrite", (store) =>
    store.delete(clientUploadId),
  ).then(() => undefined);
}

/** Hasil pengiriman satu antrean: ok=sukses · drop=gagal permanen (jangan ulangi) · retry=coba lagi nanti. */
export type SendResult = "ok" | "drop" | "retry";

/** Kirim satu antrean ke server lewat `send`; bersihkan antrean saat ok/drop. */
export async function retryPendingUpload(
  item: PendingUpload,
  send: (formData: FormData) => Promise<SendResult>,
): Promise<SendResult> {
  const formData = new FormData();
  formData.set("image", item.imageBlob, "momen.jpg");
  formData.set("tableId", item.tableId);
  formData.set("clientUploadId", item.clientUploadId);
  if (item.thumbBlob) formData.set("thumb", item.thumbBlob, "momen_320.jpg");
  if (item.width) formData.set("width", String(item.width));
  if (item.height) formData.set("height", String(item.height));

  try {
    const result = await send(formData);
    if (result !== "retry") await removePendingUpload(item.clientUploadId);
    return result;
  } catch {
    return "retry";
  }
}
