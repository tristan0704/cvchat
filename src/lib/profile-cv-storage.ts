"use client";

export const PROFILE_CV_MAX_FILE_BYTES = 20_000_000;

const DATABASE_NAME = "careerpitch";
const DATABASE_VERSION = 1;
const STORE_NAME = "profile";
const PROFILE_CV_KEY = "cv";

export type StoredProfileCvRecord = {
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
    file: Blob;
};

export type StoredProfileCvSummary = Omit<StoredProfileCvRecord, "file">;

function getStorageErrorMessage() {
    return "Lebenslauf konnte im Browser nicht gespeichert werden.";
}

function isBrowserStorageAvailable() {
    return typeof window !== "undefined" && "indexedDB" in window;
}

function isStoredProfileCvRecord(value: unknown): value is StoredProfileCvRecord {
    if (!value || typeof value !== "object") return false;

    const candidate = value as Partial<StoredProfileCvRecord>;
    return (
        typeof candidate.name === "string" &&
        typeof candidate.type === "string" &&
        typeof candidate.size === "number" &&
        typeof candidate.uploadedAt === "string" &&
        candidate.file instanceof Blob
    );
}

function openProfileCvDatabase() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        if (!isBrowserStorageAvailable()) {
            reject(new Error(getStorageErrorMessage()));
            return;
        }

        const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

        request.onupgradeneeded = () => {
            const database = request.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
            reject(request.error ?? new Error(getStorageErrorMessage()));
    });
}

async function runProfileCvStoreRequest<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
) {
    const database = await openProfileCvDatabase();

    return new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = operation(store);

        transaction.oncomplete = () => database.close();
        transaction.onerror = () =>
            reject(transaction.error ?? new Error(getStorageErrorMessage()));
        transaction.onabort = () =>
            reject(transaction.error ?? new Error(getStorageErrorMessage()));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
            reject(request.error ?? new Error(getStorageErrorMessage()));
    });
}

export function buildStoredProfileCvFingerprint(
    cv: Pick<StoredProfileCvSummary, "name" | "size" | "uploadedAt">
) {
    return [cv.name.trim().toLowerCase(), cv.size, cv.uploadedAt].join("|");
}

export async function loadStoredProfileCv() {
    const raw = await runProfileCvStoreRequest<unknown>("readonly", (store) =>
        store.get(PROFILE_CV_KEY)
    );

    if (!isStoredProfileCvRecord(raw)) return null;

    return raw;
}

export async function saveStoredProfileCv(file: File) {
    const record: StoredProfileCvRecord = {
        name: file.name,
        type: file.type || "application/pdf",
        size: file.size,
        uploadedAt: new Date().toISOString(),
        file,
    };

    await runProfileCvStoreRequest("readwrite", (store) =>
        store.put(record, PROFILE_CV_KEY)
    );

    return record;
}
