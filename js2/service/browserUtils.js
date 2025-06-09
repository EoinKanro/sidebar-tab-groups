
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

export async function openEmptyWindow() {
  return await browser.windows.create({
    type: 'normal'
  });
}

export async function closeWindow(id) {
  await browser.windows.remove(id);
}

export async function focusWindow(id) {
  await browser.windows.update(id, { focused: true });
}

export async function getCurrentWindow() {
  await browser.windows.getCurrent();
}

export async function openTab(url, windowId) {
  return await (browser.tabs.create({
    url: url,
    windowId: windowId
  }));
}

export async function closeTabs(tabIdOrList) {
  try {
    await browser.tabs.remove(tabIdOrList);
  } catch (e) {
    console.warn("Can't close tabs", e);
  }
}

export async function suspendTabs(tabIdOrList) {
  try {
    await browser.tabs.discard(tabIdOrList);
  } catch (e) {
    console.warn("Can't suspend tabs", e);
  }
}

export async function hideTabs(tabIdOrList) {
  try {
    await browser.tabs.hide(tabIdOrList);
  } catch (e) {
    console.warn("Can't hide tabs", e);
  }
}
