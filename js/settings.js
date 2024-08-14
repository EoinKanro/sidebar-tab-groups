import {
    deleteActiveGroup, deleteAllGroups,
    getBackupMinutes,
    getEnableBackup,
    saveBackupMinutes,
    saveEnableBackup, saveGroup
} from "./data/dataStorage.js";
import {notify, notifyBackgroundReloadAllGroups, notifyBackgroundUpdateBackup} from "./data/events.js";
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
        colors.button = "rgba(207,207,216,.33)";
        colors.button_active = "rgb(207,207,216)";
    }

    style.innerHTML =
        `
        body {
            background-color: ${colors.popup};
            color: ${colors.popup_text};
        }
        
        .button-class {
            background-color: ${colors.button};
            color: ${colors.popup_text};
        }
        
        .button-class:hover {
            background-color: ${colors.button_active} !important;
        }
        
        `;
})

const backupCheckbox = document.getElementById('backup-checkbox');
const backupTime = document.getElementById('backup-time');
const saveBackupButton = document.getElementById('save-backup-button');
const restoreText = document.getElementById('restore-text');
const restoreButton = document.getElementById('restore-button');


let isBackup = await getEnableBackup();
let backupMinutes = await getBackupMinutes();

backupCheckbox.checked = isBackup;
if (backupMinutes) {
    backupTime.value = backupMinutes;
}

//Restrict non digits
backupTime.addEventListener('input', (event) => {
    const value = event.target.value;
    event.target.value = value.replace(/[^0-9]/g, '');
});

//Update on click
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