export const tabGroupsName = "tab-groups";

let db;

async function getDatabase() {
    if (db) {
        return db;
    }

    return new Promise((resolve, reject) => {
        //Open database
        const request = indexedDB.open("SidebarTabGroups", 1);

        //Update if necessary
        request.onupgradeneeded = function (event) {
            const db = event.target.result;

            if (event.oldVersion < 1) {
                //create store for tab-groups and temp
                const tabsStore = db.createObjectStore(tabGroupsName, {keyPath: "id"});
                tabsStore.createIndex("id", "id", {unique: true});
            }
        };

        request.onsuccess = function (event) {
            db = event.target.result;
            console.log("Database initialized successfully");
            resolve(db);
        };

        request.onerror = function (event) {
            console.error("Database error:", event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

/**
 * @returns {Promise<unknown>} array/null
 */
export function getAllData(storeName) {
    console.log(`Getting all from ${storeName}`)

    return new Promise(async (resolve) => {
        try {
            const db = await getDatabase();
            const transaction = db.transaction([storeName], "readonly");
            const store = transaction.objectStore(storeName);

            const requestDb = store.getAll();

            requestDb.onsuccess = function(event) {
                console.log(`Got all successfully: `, event.target.result)
                resolve(event.target.result);
            };

            requestDb.onerror = function(event) {
                console.log(`Got all with error: `, event)
                resolve(null);
            };
        } catch (e) {
            resolve(null);
        }
    });
}

/**
 * @returns {Promise<unknown>} obj/null
 */
export function getData(storeName, key) {
    console.log(`Getting data ${key} from ${storeName}`)

    return new Promise(async (resolve, reject) => {
        try {
            const db = await getDatabase();
            const transaction = db.transaction([storeName], "readonly");
            const store = transaction.objectStore(storeName);

            const requestDb = store.get(key);
            requestDb.onsuccess = function (event) {
                console.log(`Got successfully: `, key, event.target.result);
                resolve(event.target.result || null);
            };
            requestDb.onerror = function (event) {
                console.log(`Got with error. `, key, event);
                resolve(null);
            };
        } catch (e) {
            resolve(null);
        }
    });
}

/**
 * @returns {Promise<unknown>} true/false
 */
export function saveData(storeName, data) {
    console.log(`Saving data in ${storeName}`, data)

    return new Promise(async (resolve) => {
        try {
            const db = await getDatabase();
            const transaction = db.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);

            const requestDb = store.put(data);
            requestDb.onsuccess = function (event) {
                console.log(`Saved successfully: `, data);
                resolve(true);
            };
            requestDb.onerror = function (event) {
                console.log(`Saved with error. `, data, event);
                resolve(false);
            };
        } catch (e) {
            resolve(false);
        }
    });
}

/**
 * @returns {Promise<unknown>} true/false
 */
export function deleteData(storeName, key) {
    console.log(`Deleting ${key} from ${storeName}`)

    return new Promise(async (resolve) => {
        try {
            const db = await getDatabase();
            const transaction = db.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);

            const requestDb = store.delete(key);
            requestDb.onsuccess = function (event) {
                console.log(`Deleted successfully: `, key);
                resolve(true);
            };
            requestDb.onerror = function (event) {
                console.log(`Got data with error.`, key, event);
                resolve(false);
            };
        } catch (e) {
            resolve(false);
        }
    });
}
