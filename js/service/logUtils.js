
export class Logger {
  constructor(enabled, source) {
    this.enabled = enabled;
    this.source = source;
  }

  logInfo(message, args = null) {
    if (!this.enabled) {
      return;
    }
    console.log(message, this.source, args);
  }
}
