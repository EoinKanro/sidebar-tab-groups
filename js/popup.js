import {notify, notifyBackgroundUpdateBackup} from "./data/events.js";
import {getBackupMinutes, getEnableBackup, saveBackupMinutes, saveEnableBackup} from "./data/dataStorage.js";

const backupCheckbox = document.getElementById('backup-checkbox');
const backupTime = document.getElementById('backup-time');

let isBackup = await getEnableBackup();
let backupMinutes = await getBackupMinutes();

backupCheckbox.checked = isBackup;
if (backupMinutes) {
    backupTime.value = backupMinutes;
}

//if changed checkbox
backupCheckbox.addEventListener('click', async () => {
    await saveEnableBackup(backupCheckbox.checked);
});

//Restrict non digits
backupTime.addEventListener('input', (event) => {
    const value = event.target.value;
    event.target.value = value.replace(/[^0-9]/g, '');
});

//Save on update
backupTime.addEventListener('input', async () => {
    await saveBackupMinutes(backupTime.value)
});

//Update on close
window.addEventListener('unload', () => {
    notify(notifyBackgroundUpdateBackup, null);
});
