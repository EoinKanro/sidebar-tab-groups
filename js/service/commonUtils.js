
export function replaceNonDigits(value) {
  return value.replace(/[^0-9]/g, '');
}

export function isUrlEmpty(url) {
  return url === undefined || !url || url.includes("about:blank") || url.includes("about:newtab")
      || url.includes("about:home");
}
