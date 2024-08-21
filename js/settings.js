import {
    deleteActiveGroup, deleteAllGroups,
    getBackupMinutes, getIfCloseTabs,
    getEnableBackup,
    saveBackupMinutes, saveIfCloseTabs,
    saveEnableBackup, saveGroup, getSidebarButtonsPadding, saveSidebarButtonsPadding
} from "./data/dataStorage.js";
import {
    notify,
    notifyBackgroundReloadAllGroups,
    notifyBackgroundUpdateBackup,
    notifySidebarUpdateButtonsPadding
} from "./data/events.js";
import {backupGroups} from "./data/utils.js";

//load style
let style = document.getElementById("js-style")
if (!style) {
    style = document.createElement('style');
    style.id = "js-style";
    document.head.appendChild(style);
}
browser.theme.getCurrent().then(theme => {
    let colors;
    if (theme?.colors) {
        colors = theme.colors;
    } else {
        colors = {};
        colors.popup = "#fff";
        colors.popup_text = "rgb(21,20,26)";
        colors.toolbar = "rgba(207,207,216,.33)";
        colors.toolbar_text = "rgb(21,20,26)";
    }

    style.innerHTML =
        `
        body {
            background-color: ${colors.popup};
            color: ${colors.popup_text};
        }
        
        .button-class {
            background-color: ${colors.toolbar};
            color: ${colors.toolbar_text};
        }
        
        `;
})

const sidebarButtonsPadding = document.getElementById('sidebar-buttons-padding');
const saveAppearanceButton = document.getElementById('save-appearance-button');
const backupCheckbox = document.getElementById('backup-checkbox');
const backupTime = document.getElementById('backup-time');
const saveBackupButton = document.getElementById('save-backup-button');
const restoreText = document.getElementById('restore-text');
const restoreButton = document.getElementById('restore-button');
const closeTabsCheckbox = document.getElementById('close-tabs-checkbox');
const saveTabsButton = document.getElementById('save-tabs-button');


const sidebarButtonsPaddingPx = await getSidebarButtonsPadding();
const isBackup = await getEnableBackup();
const backupMinutes = await getBackupMinutes();
const isCloseTabs = await getIfCloseTabs();

//Set data from store
if (sidebarButtonsPaddingPx) {
    sidebarButtonsPadding.value = sidebarButtonsPaddingPx;
}

backupCheckbox.checked = isBackup;
if (backupMinutes) {
    backupTime.value = backupMinutes;
}

closeTabsCheckbox.checked = isCloseTabs;


//Restrict non digits
sidebarButtonsPadding.addEventListener('input', (event) => {
    event.target.value = replaceNonDigits(event.target.value);
});
backupTime.addEventListener('input', (event) => {
    event.target.value = replaceNonDigits(event.target.value);
});

function replaceNonDigits(value) {
    return value.replace(/[^0-9]/g, '');
}

//Save appearance settings
saveAppearanceButton.addEventListener('click', async (event) => {
    await saveSidebarButtonsPadding(sidebarButtonsPadding.value);
    notify(notifySidebarUpdateButtonsPadding, null);
    alert("Appearance settings are updated")
})

//Save backup settings
saveBackupButton.addEventListener('click', async (event) => {
    if (backupCheckbox.checked && (!backupTime.value || Number(backupTime.value) <= 0)) {
        alert("Wrong value of minutes for backup");
        return
    }

    await saveEnableBackup(backupCheckbox.checked);
    await saveBackupMinutes(backupTime.value);
    notify(notifyBackgroundUpdateBackup, null);

    const alertText = backupCheckbox.checked ?
        `Backup will be saved in Downloads every ${backupTime.value} minutes` :
        `Backup switched off`;
    alert(alertText);
})

//Reload from backup
restoreButton.addEventListener('click', async (event) => {
    const restoreTextData = restoreText.value;
    if (!restoreTextData) {
        alert("There is nothing to restore");
        return;
    }

    const brokenText = "The Json is broken. Can't restore";
    if (!restoreTextData.startsWith("[") || !restoreTextData.endsWith("]")
        || !restoreTextData.includes("tabs") || !restoreTextData.includes("icon")) {
        alert(brokenText);
        return;
    }

    let restoreJson;
    try {
        restoreJson = JSON.parse(restoreTextData);
    } catch (e) {
        console.log(e);
        alert(brokenText);
        return;
    }

    await backupGroups();
    await deleteActiveGroup(true);
    await deleteAllGroups()

    for (const item of restoreJson) {
        await saveGroup(item);
    }

    notify(notifyBackgroundReloadAllGroups, null);
    alert("Restoration is complete. If something is wrong you can find a backup right before the restoration in Downloads");
})

//Save tab settings
saveTabsButton.addEventListener('click', async (event) => {
    await saveIfCloseTabs(closeTabsCheckbox.checked);
    alert("Tabs settings are updated");
});
