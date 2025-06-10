
export function logInfo(enabled, message, args = null) {
  if (!enabled) {
    return;
  }
  console.log(message, args);
}
