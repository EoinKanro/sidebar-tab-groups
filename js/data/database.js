import {
    getFromDatabase,
    getAllFromDatabase,
    saveInDatabase,
    deleteFromDatabase
} from "./events.js"

//TODO REMOVE
indexedDB.deleteDatabase("SidebarTabGroups")

export class Request {
    constructor(storeName, data) {
        this.storeName = storeName;
        this.data = data;
    }
}
export const tabGroupsName = "tab-groups";

let db;

export async function initDatabase() {
    //Initialize database requests handlers for outside contexts
     await browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        console.log("got db request", message);
        let result;

        if (message.command === getFromDatabase) {
            result = await getData(message.data);
        } else if (message.command === getAllFromDatabase) {
            result = await getAllData(message.data);
        } else if (message.command === saveInDatabase) {
            result = await saveData(message.data)
        } else if (message.command === deleteFromDatabase) {
            result = await deleteData(message.data);
        }

        if (result) {
            sendResponse({result})
        }
    });

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
export function getAllData(request) {
    console.log(`Getting all from ${request.storeName}`)

    return new Promise(async (resolve) => {
        const transaction = db.transaction([request.storeName], "readonly");
        const store = transaction.objectStore(request.storeName);
        const requestDb = store.openCursor();

        const result = [];

        requestDb.onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                result.push(cursor.value);
                cursor.continue();
            } else {
                console.log(`Got all successfully: ${toJson(result)}`)
                resolve(result);
            }
        };
        requestDb.onerror = function (event) {
            console.log(`Got all with error: }`, event)
            resolve(null);
        };
    });
}

/**
 * @returns {Promise<unknown>} obj/null
 */
export function getData(request) {
    console.log(`Getting ${request.data} from ${request.storeName}`)

    return new Promise(async (resolve, reject) => {
        const transaction = db.transaction([request.storeName], "readonly");
        const store = transaction.objectStore(request.storeName);

        const requestDb = store.get(request.data);
        requestDb.onsuccess = function (event) {
            console.log(`Got ${toJson(request.data)} successfully: ${toJson(event.target.result)}`);
            resolve(event.target.result || null);
        };
        requestDb.onerror = function (event) {
            console.log(`Got ${toJson(request.data)} with error: `, event);
            resolve(null);
        };
    });
}

/**
 * @returns {Promise<unknown>} true/false
 */
export function saveData(request) {
    console.log(`Saving ${JSON.stringify(request.data, null, 0)} in ${request.storeName}`)

    return new Promise(async (resolve) => {
        const transaction = db.transaction([request.storeName], "readwrite");
        const store = transaction.objectStore(request.storeName);

        const requestDb = store.put(request.data);
        requestDb.onsuccess = function (event) {
            console.log(`Saved ${toJson(request.data)} successfully`);
            resolve(true);
        };
        requestDb.onerror = function (event) {
            console.log(`Saved ${toJson(request.data)} with error: `, event);
            resolve(false);
        };
    });
}

/**
 * @returns {Promise<unknown>} true/false
 */
export function deleteData(request) {
    console.log(`Deleting ${request.data} from ${request.storeName}`)

    return new Promise(async (resolve) => {
        const transaction = db.transaction([request.storeName], "readwrite");
        const store = transaction.objectStore(request.storeName);

        const requestDb = store.delete(request.data);
        requestDb.onsuccess = function (event) {
            console.log(`Deleted ${toJson(request.data)} successfully`);
            resolve(true);
        };
        requestDb.onerror = function (event) {
            console.log(`Got ${toJson(request.data)} with error: `, event);
            resolve(false);
        };
    });
}

function toJson(obj) {
    return JSON.stringify(obj, null, 0)
}
