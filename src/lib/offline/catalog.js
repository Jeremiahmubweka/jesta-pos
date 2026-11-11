
import { openOfflineDatabase } from "./database";

/**
 * Replace records belonging to one business without
 * affecting another business's cached records.
 */
function replaceBusinessRecords(storeName, businessId, records) {
  return openOfflineDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        let transaction;

        try {
          transaction = db.transaction(storeName, "readwrite");

          const store = transaction.objectStore(storeName);
          const index = store.index("business_id");

          const request = index.openCursor(
            IDBKeyRange.only(businessId)
          );

          request.onsuccess = () => {
            const cursor = request.result;

            if (cursor) {
              cursor.delete();
              cursor.continue();
              return;
            }

            records.forEach((record) => {
              store.put({
                ...record,
                business_id: businessId,
              });
            });
          };

          transaction.oncomplete = () => resolve(true);

          transaction.onerror = () => {
            reject(
              transaction.error ||
                new Error(`Could not cache ${storeName}.`)
            );
          };

          transaction.onabort = () => {
            reject(
              transaction.error ||
                new Error(`Caching ${storeName} was cancelled.`)
            );
          };
        } catch (error) {
          if (transaction) {
            transaction.abort();
          }

          reject(error);
        }
      })
  );
}

/**
 * Cache active products and customers for one business.
 */
export async function cacheBusinessCatalog(
  businessId,
  products,
  customers
) {
  if (businessId === undefined || businessId === null) {
    throw new Error("A business ID is required.");
  }

  if (!Array.isArray(products) || !Array.isArray(customers)) {
    throw new Error("Products and customers must be arrays.");
  }

  await replaceBusinessRecords(
    "products",
    businessId,
    products.filter((product) => product.is_active !== false)
  );

  await replaceBusinessRecords(
    "customers",
    businessId,
    customers.filter((customer) => customer.is_active !== false)
  );

  return true;
}

/**
 * Retrieve locally cached products and customers for one business.
 */
export async function getCachedBusinessCatalog(businessId) {
  if (businessId === undefined || businessId === null) {
    throw new Error("A business ID is required.");
  }

  const db = await openOfflineDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      ["products", "customers"],
      "readonly"
    );

    const productsRequest = transaction
      .objectStore("products")
      .index("business_id")
      .getAll(IDBKeyRange.only(businessId));

    const customersRequest = transaction
      .objectStore("customers")
      .index("business_id")
      .getAll(IDBKeyRange.only(businessId));

    let products = [];
    let customers = [];

    productsRequest.onsuccess = () => {
      products = productsRequest.result.filter(
        (product) => product.is_active !== false
      );
    };

    customersRequest.onsuccess = () => {
      customers = customersRequest.result.filter(
        (customer) => customer.is_active !== false
      );
    };

    transaction.oncomplete = () => {
      resolve({ products, customers });
    };

    transaction.onerror = () => {
      reject(
        transaction.error ||
          new Error("Could not retrieve the offline catalogue.")
      );
    };

    transaction.onabort = () => {
      reject(
        transaction.error ||
          new Error("Retrieving the offline catalogue was cancelled.")
      );
    };
  });
}
