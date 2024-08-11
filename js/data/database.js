import { getFromDatabase, getAllFromDatabase, saveInDatabase, deleteFromDatabase } from "./events.js"

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
    /**
     * Initialize database requests handler
     */
     browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        console.log("got db request")
        switch (message.command) {
            case getFromDatabase:
                sendResponse(await getData(message.data));
                break;
            case getAllFromDatabase:
                sendResponse(await getAllData(message.data));
                break;
            case saveInDatabase:
                sendResponse(await saveData(message.data));
                break;
            case deleteFromDatabase:
                sendResponse(await deleteData(message.data));
                break;
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
function getAllData(request) {
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
            console.log(`Got all with error: ${event.errorCode}`)
            resolve(null);
        };
    });
}

/**
 * @returns {Promise<unknown>} obj/null
 */
function getData(request) {
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
            console.log(`Got ${toJson(request.data)} with error: ${toJson(event.errorCode)}`);
            resolve(null);
        };
    });
}

/**
 * @returns {Promise<unknown>} true/false
 */
function saveData(request) {
    console.log(`Saving ${JSON.stringify(request.data, null, 0)} in ${request.storeName}`)

    return new Promise(async (resolve) => {
        const transaction = db.transaction([request.storeName], "readwrite");
        const store = transaction.objectStore(request.storeName);

        const requestDb = store.add(request.data);
        requestDb.onsuccess = function (event) {
            console.log(`Saved ${toJson(request.data)} successfully`);
            resolve(true);
        };
        requestDb.onerror = function (event) {
            console.log(`Saved ${toJson(request.data)} with error: ${event.errorCode}`);
            resolve(false);
        };
    });
}

/**
 * @returns {Promise<unknown>} true/false
 */
function deleteData(request) {
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
            console.log(`Got ${toJson(request.data)} with error: ${event.errorCode}`);
            resolve(false);
        };
    });
}

function toJson(obj) {
    return JSON.stringify(obj, null, 0)
}
