
const DATABASE_NAME = "jesta_offline_db";
const DATABASE_VERSION = 1;

let databasePromise = null;

/**
 * Opens the JESTA offline database.
 * Creates the required object stores the first time it runs.
 */
export function openOfflineDatabase() {
  if (!("indexedDB" in window)) {
    return Promise.reject(
      new Error("This browser does not support IndexedDB.")
    );
  }

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DATABASE_NAME,
      DATABASE_VERSION
    );

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", {
          keyPath: "key",
        });
      }

      if (!db.objectStoreNames.contains("products")) {
        const products = db.createObjectStore("products", {
          keyPath: "id",
        });

        products.createIndex("business_id", "business_id", {
          unique: false,
        });

        products.createIndex("barcode", "barcode", {
          unique: false,
        });

        products.createIndex(
          "business_id_barcode",
          ["business_id", "barcode"],
          { unique: false }
        );
      }

      if (!db.objectStoreNames.contains("customers")) {
        const customers = db.createObjectStore("customers", {
          keyPath: "id",
        });

        customers.createIndex("business_id", "business_id", {
          unique: false,
        });
      }

      if (!db.objectStoreNames.contains("pending_sales")) {
        const pendingSales = db.createObjectStore(
          "pending_sales",
          {
            keyPath: "client_transaction_id",
          }
        );

        pendingSales.createIndex("business_id", "business_id", {
          unique: false,
        });

        pendingSales.createIndex("status", "status", {
          unique: false,
        });

        pendingSales.createIndex("created_at", "created_at", {
          unique: false,
        });
      }

      if (!db.objectStoreNames.contains("sync_conflicts")) {
        const conflicts = db.createObjectStore(
          "sync_conflicts",
          {
            keyPath: "id",
          }
        );

        conflicts.createIndex("business_id", "business_id", {
          unique: false,
        });

        conflicts.createIndex("created_at", "created_at", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => {
        db.close();
        databasePromise = null;
      };

      resolve(db);
    };

    request.onerror = () => {
      databasePromise = null;

      reject(
        request.error ||
          new Error("Could not open the JESTA offline database.")
      );
    };

    request.onblocked = () => {
      console.warn(
        "JESTA offline database upgrade is blocked by another tab."
      );
    };
  });

  return databasePromise;
}

/**
 * Save or update a metadata value.
 */
export async function saveOfflineMetadata(key, value) {
  if (!key || typeof key !== "string") {
    throw new Error("A valid metadata key is required.");
  }

  const db = await openOfflineDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("metadata", "readwrite");
    const store = transaction.objectStore("metadata");

    store.put({
      key,
      value,
      updated_at: new Date().toISOString(),
    });

    transaction.oncomplete = () => resolve(true);

    transaction.onerror = () => {
      reject(
        transaction.error ||
          new Error("Could not save offline metadata.")
      );
    };

    transaction.onabort = () => {
      reject(
        transaction.error ||
          new Error("Saving offline metadata was cancelled.")
      );
    };
  });
}

/**
 * Retrieve a metadata value.
 */
export async function getOfflineMetadata(key) {
  if (!key || typeof key !== "string") {
    throw new Error("A valid metadata key is required.");
  }

  const db = await openOfflineDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("metadata", "readonly");
    const store = transaction.objectStore("metadata");
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result?.value ?? null);
    };

    request.onerror = () => {
      reject(
        request.error ||
          new Error("Could not retrieve offline metadata.")
      );
    };
  });
}

/**
 * Runs one IndexedDB operation.
 */
function runTransaction(storeName, mode, operation) {
  return openOfflineDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        let transaction;
        let result;

        try {
          transaction = db.transaction(storeName, mode);
          const store = transaction.objectStore(storeName);

          operation(store, (value) => {
            result = value;
          });
        } catch (error) {
          reject(error);
          return;
        }

        transaction.oncomplete = () => resolve(result);

        transaction.onerror = () => {
          reject(
            transaction.error ||
              new Error("The local database operation failed.")
          );
        };

        transaction.onabort = () => {
          reject(
            transaction.error ||
              new Error("The local database operation was cancelled.")
          );
        };
      })
  );
}

/**
 * Saves or updates one record.
 */
export function putRecord(storeName, record) {
  if (!record || typeof record !== "object") {
    return Promise.reject(
      new Error("A valid record is required.")
    );
  }

  return runTransaction(storeName, "readwrite", (store, setResult) => {
    const request = store.put(record);

    request.onsuccess = () => setResult(request.result);
  });
}

/**
 * Retrieves one record using its primary key.
 */
export function getRecord(storeName, key) {
  return runTransaction(storeName, "readonly", (store, setResult) => {
    const request = store.get(key);

    request.onsuccess = () => {
      setResult(request.result ?? null);
    };
  });
}

/**
 * Retrieves all records belonging to one business.
 */
export function getBusinessRecords(storeName, businessId) {
  if (businessId === undefined || businessId === null) {
    return Promise.reject(
      new Error("A business ID is required.")
    );
  }

  return runTransaction(storeName, "readonly", (store, setResult) => {
    if (!store.indexNames.contains("business_id")) {
      throw new Error(
        `${storeName} does not have a business_id index.`
      );
    }

    const request = store
      .index("business_id")
      .getAll(IDBKeyRange.only(businessId));

    request.onsuccess = () => {
      setResult(request.result || []);
    };
  });
}

/**
 * Deletes one record using its primary key.
 */
export function deleteRecord(storeName, key) {
  return runTransaction(storeName, "readwrite", (store, setResult) => {
    const request = store.delete(key);

    request.onsuccess = () => setResult(true);
  });
}

/**
 * Saves an offline cash sale.
 */
export function savePendingSale(sale) {
  if (!sale || typeof sale !== "object") {
    return Promise.reject(
      new Error("A valid sale is required.")
    );
  }

  if (!sale.client_transaction_id) {
    return Promise.reject(
      new Error("The offline transaction ID is required.")
    );
  }

  if (sale.business_id === undefined || sale.business_id === null) {
    return Promise.reject(
      new Error("The business ID is required.")
    );
  }

  if (sale.payment_method !== "cash") {
    return Promise.reject(
      new Error("Only cash sales can be saved offline.")
    );
  }

  return putRecord("pending_sales", {
    ...sale,
    status: "pending",
  });
}

/**
 * Requests persistent browser storage.
 */
export async function requestPersistentStorage() {
  if (
    !navigator.storage ||
    typeof navigator.storage.persist !== "function"
  ) {
    return false;
  }

  try {
    return await navigator.storage.persist();
  } catch (error) {
    console.error("Could not request persistent storage:", error);
    return false;
  }
}

/**
 * Checks whether persistent storage has been granted.
 */
export async function isStoragePersistent() {
  if (
    !navigator.storage ||
    typeof navigator.storage.persisted !== "function"
  ) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch (error) {
    console.error("Could not check persistent storage:", error);
    return false;
  }
}

