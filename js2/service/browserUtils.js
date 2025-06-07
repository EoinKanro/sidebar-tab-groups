
export async function getAllOpenedTabs() {
  return await browser.tabs.query({});
}

export async function openPopup(url, widthMultiplier, heightMultiplier) {
  const viewportWidth = Math.round(window.screen.width * widthMultiplier);
  const viewportHeight = Math.round(window.screen.height * heightMultiplier);

  browser.windows.create({
    url: browser.runtime.getURL(url),
    type: "popup",
    width: viewportWidth,
    height: viewportHeight
  })
}

export async function getExtensionPopupWithName(shortUrl) {
  const popups = await browser.windows.getAll({
    populate: true,
    windowTypes:['popup']
  });

  for (const popup of popups) {
    if (popup.tabs?.some(tab => tab.url.endsWith(shortUrl))) {
      return popup;
    }
  }
  return null;
}

export async function focusWindow(id) {
  await browser.windows.update(id, { focused: true });
}

export async function getCurrentWindow() {
  await browser.windows.getCurrent();
}
