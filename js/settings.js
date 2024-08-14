import {getBackupMinutes, getEnableBackup, saveBackupMinutes, saveEnableBackup} from "./data/dataStorage.js";
import {notify, notifyBackgroundUpdateBackup} from "./data/events.js";

const backupCheckbox = document.getElementById('backup-checkbox');
const backupTime = document.getElementById('backup-time');
const saveBackup = document.getElementById('save-backup');

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
saveBackup.addEventListener('click', async (event) => {
    await saveEnableBackup(backupCheckbox.checked);
    await saveBackupMinutes(backupTime.value);
    notify(notifyBackgroundUpdateBackup, null);
    alert("Backup has been updated successfully.");
})
