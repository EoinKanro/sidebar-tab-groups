browser.runtime.onInstalled.addListener(() => {
    console.log("Tab Manager Extension Installed");
});

// Automatically save tab groups when the browser window is closed
browser.windows.onRemoved.addListener(windowId => {
    browser.tabs.query({windowId}, (tabs) => {
        if (tabs.length > 0) {
            let group = {
                id: new Date().getTime(),
                tabs: tabs.map(tab => tab.id)
            };
            browser.storage.local.set({[group.id]: group}).then(() => {
                console.log("Group automatically saved:", group);
            });
        }
    });
});

//update current
// Add event listener for when a new tab is opened
browser.tabs.onCreated.addListener((tab) => {
    console.log(`A new tab has been opened: ID ${tab.id}, Title: ${tab.title}`);
    // You can add your code here for when a tab is created
});

// Add event listener for when a tab is closed
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    console.log(`A tab has been closed: ID ${tabId}`);
    // You can add your code here for when a tab is removed
});
