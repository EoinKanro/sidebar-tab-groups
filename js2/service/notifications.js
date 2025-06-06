
export const reinitBackupThreadId = 1;
export const restoreFromBackupId = 2;

class Event {
  constructor(id, data = {}) {
    this.id = id;
    this.data = data;
  }
}

function notify(event) {
  console.log("Sending event to runtime...", event);
  browser.runtime.sendMessage(event);
}

export function notifyReinitBackupThread() {
  notify(new Event(reinitBackupThreadId));
}

export function notifyRestoreFromBackup(json) {
  notify(new Event(restoreFromBackupId, {
    json: json
  }))
}
