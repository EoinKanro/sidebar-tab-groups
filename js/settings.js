import {
  initThemeStyle,
  updatePopupStyle
} from "./service/styleUtils.js";
import {
  getBackupMinutes,
  getEnableBackup,
  getSidebarButtonsPaddingPx,
  getTabsBehaviorOnChangeGroup,
  saveBackupMinutes,
  saveEnableBackup,
  saveSidebarButtonsPaddingPx,
  saveTabsBehaviorOnChangeGroup
} from "./data/localStorage.js";
import {
  notifyReinitBackupThread,
  notifyRestoreFromBackup
} from "./service/notifications.js";
import {TABS_BEHAVIOR} from "./data/dataClasses.js";
import {replaceNonDigits} from "./service/commonUtils.js";
import {backupGroups} from "./service/backupUtils.js";

//------------------ Document elements -----------------------

const sidebarButtonsPadding = document.getElementById('sidebar-buttons-padding');
const saveAppearanceButton = document.getElementById('save-appearance-button');
const backupCheckbox = document.getElementById('backup-checkbox');
const backupTime = document.getElementById('backup-time');
const backupNowButton = document.getElementById('backup-now-button');
const saveBackupButton = document.getElementById('save-backup-button');
const restoreText = document.getElementById('restore-text');
const restoreButton = document.getElementById('restore-button');
const tabsBehaviorSelect = document.getElementById('tabs-behavior');
const saveTabsButton = document.getElementById('save-tabs-button');

// ------------------ Initialization ------------------------

await init();

async function init() {
  initThemeStyle(updatePopupStyle);

  const sidebarButtonsPaddingPx = await getSidebarButtonsPaddingPx();
  const isBackup = await getEnableBackup();
  const backupMinutes = await getBackupMinutes();
  const tabsBehaviorOnChangeGroup = await getTabsBehaviorOnChangeGroup();

  //Set data from store
  if (sidebarButtonsPaddingPx) {
    sidebarButtonsPadding.value = sidebarButtonsPaddingPx;
  }

  backupCheckbox.checked = isBackup;
  if (backupMinutes) {
    backupTime.value = backupMinutes;
  }

  tabsBehaviorSelect.replaceChildren();
  Object.values(TABS_BEHAVIOR).forEach(option => {
    const opt = document.createElement('option');
    opt.textContent = option;
    tabsBehaviorSelect.appendChild(opt);
  });

  let selectedTabsBehaviorValue = Object.values(TABS_BEHAVIOR)
  .find(valueF => valueF === tabsBehaviorOnChangeGroup);

  if (selectedTabsBehaviorValue === undefined || !selectedTabsBehaviorValue) {
    await saveTabsBehaviorOnChangeGroup(TABS_BEHAVIOR.SUSPEND);
    selectedTabsBehaviorValue = TABS_BEHAVIOR.SUSPEND;
  }

  tabsBehaviorSelect.value = selectedTabsBehaviorValue;
}

//-------------------- Appearance section listeners ----------------------

//allow only digits
sidebarButtonsPadding.oninput = function (event) {
  event.target.value = replaceNonDigits(event.target.value);
};

//Save appearance settings
saveAppearanceButton.onclick = async function () {
  await saveSidebarButtonsPaddingPx(sidebarButtonsPadding.value);
  alert("Appearance settings are updated");
};

//---------------------- Backup section listeners --------------------------

//allow only digits
backupTime.oninput = function (event) {
  event.target.value = replaceNonDigits(event.target.value);
};

backupNowButton.onclick = async function (event) {
  const result = await backupGroups();
  if (result) {
    alert("Backup was finished successfully.");
  } else {
    alert("Backup was finished with an error");
  }
}

//Save backup settings
saveBackupButton.onclick = async function () {
  if (backupCheckbox.checked && (!backupTime.value || Number(backupTime.value) <= 0)) {
    alert("Wrong value of minutes for backup");
    return;
  }

  await saveEnableBackup(backupCheckbox.checked);
  await saveBackupMinutes(backupTime.value);
  notifyReinitBackupThread();

  const alertText = backupCheckbox.checked ?
      `Backup will be saved in Downloads every ${backupTime.value} minutes` :
      `Backup switched off`;
  alert(alertText);
};

//---------------------- Restore section listeners --------------------------

restoreButton.onclick = async function () {
  const restoreTextData = restoreText.value;
  if (!restoreTextData) {
    alert("There is nothing to restore");
    return;
  }

  const brokenTextMbOldFormat = "Can't read the Json. Make sure the text has the format: {\"allGroups\":[...],...}"
  if (!restoreTextData.startsWith("{") || !restoreTextData.endsWith("}")
      || !restoreTextData.includes("tabs") || !restoreTextData.includes("icon")) {
    alert(brokenTextMbOldFormat);
    return;
  }

  const brokenText = "The Json is broken. Can't restore";
  let restoreJson;
  try {
    restoreJson = JSON.parse(restoreTextData);
  } catch (e) {
    console.log(e);
    alert(brokenText);
    return;
  }

  notifyRestoreFromBackup(restoreJson);
  alert("Restoration is complete. If something is wrong you can find a backup file right before the restoration in Downloads");
};

//------------------ Tabs section listeners -----------------------

//Save tab settings
saveTabsButton.onclick = async function () {
  await saveTabsBehaviorOnChangeGroup(tabsBehaviorSelect.value);
  alert("Tabs settings are updated");
};
