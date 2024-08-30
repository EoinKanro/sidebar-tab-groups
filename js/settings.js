
import {
    getBackupMinutes,
    getCloseTabsOnChangeGroup,
    getEnableBackup,
    getSidebarButtonsPaddingPx,
    saveBackupMinutes,
    saveCloseTabsOnChangeGroup,
    saveEnableBackup,
    saveSidebarButtonsPaddingPx
} from "./data/localStorage.js";
import {
    BackgroundReinitBackupEvent,
    BackgroundRestoreBackup,
    notify,
    SidebarUpdateButtonsPadding
} from "./service/events.js";
import {getStyle, updatePopupStyle} from "./service/styleUtils.js";

//----------------------- Document elements ------------------------------

const style = getStyle("js-style");
const sidebarButtonsPadding = document.getElementById('sidebar-buttons-padding');
const saveAppearanceButton = document.getElementById('save-appearance-button');
const backupCheckbox = document.getElementById('backup-checkbox');
const backupTime = document.getElementById('backup-time');
const saveBackupButton = document.getElementById('save-backup-button');
const restoreText = document.getElementById('restore-text');
const restoreButton = document.getElementById('restore-button');
const closeTabsCheckbox = document.getElementById('close-tabs-checkbox');
const saveTabsButton = document.getElementById('save-tabs-button');

//---------------------------- Init ----------------------------------------
await init();

async function init() {
    const sidebarButtonsPaddingPx = await getSidebarButtonsPaddingPx();
    const isBackup = await getEnableBackup();
    const backupMinutes = await getBackupMinutes();
    const isCloseTabs = await getCloseTabsOnChangeGroup();

    //Set data from store
    if (sidebarButtonsPaddingPx) {
        sidebarButtonsPadding.value = sidebarButtonsPaddingPx;
    }

    backupCheckbox.checked = isBackup;
    if (backupMinutes) {
        backupTime.value = backupMinutes;
    }

    closeTabsCheckbox.checked = isCloseTabs;
}

browser.theme.getCurrent().then(theme => {
    loadTheme(theme);
})

function loadTheme(theme) {
    updatePopupStyle(style, theme);
}

//---------------------- Backup listeners -----------------------------

//allow only digits
backupTime.oninput = function (event) {
    event.target.value = replaceNonDigits(event.target.value);
};

//Save backup settings
saveBackupButton.onclick = async function () {
    if (backupCheckbox.checked && (!backupTime.value || Number(backupTime.value) <= 0)) {
        alert("Wrong value of minutes for backup");
        return
    }

    await saveEnableBackup(backupCheckbox.checked);
    await saveBackupMinutes(backupTime.value);
    notify(new BackgroundReinitBackupEvent());

    const alertText = backupCheckbox.checked ?
        `Backup will be saved in Downloads every ${backupTime.value} minutes` :
        `Backup switched off`;
    alert(alertText);
};

//Reload from backup
restoreButton.onclick = async function () {
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

    notify(new BackgroundRestoreBackup(restoreJson));
    alert("Restoration is complete. If something is wrong you can find a backup file right before the restoration in Downloads");
};

//-------------------- Appearance listeners ------------------------

//update theme on change
browser.theme.onUpdated.addListener(({ theme }) => {
    loadTheme(theme);
});

//allow only digits
sidebarButtonsPadding.oninput = function (event) {
    event.target.value = replaceNonDigits(event.target.value);
};

//Save appearance settings
saveAppearanceButton.onclick = async function () {
    await saveSidebarButtonsPaddingPx(sidebarButtonsPadding.value);
    notify(new SidebarUpdateButtonsPadding());
    alert("Appearance settings are updated");
};

//------------------ Tabs listeners -----------------------

//Save tab settings
saveTabsButton.onclick = async function () {
    await saveCloseTabsOnChangeGroup(closeTabsCheckbox.checked);
    alert("Tabs settings are updated");
};

//----------------- Utils -------------------

function replaceNonDigits(value) {
    return value.replace(/[^0-9]/g, '');
}
