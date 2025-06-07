import {initThemeStyle, updatePopupStyle} from "./service/styleUtils.js";
import {
  focusWindow,
  getExtensionPopupWithName,
  openPopup
} from "./service/browserUtils";

//---------------------- Document elements -----------------------

const openSidebarButton = document.getElementById("open-sidebar-button");
const settingsButton = document.getElementById("settings-button");
const tabsManagerButton = document.getElementById("tabs-manager-button");

// -------------------- Initialization --------------------------

initThemeStyle(updatePopupStyle);

//----------------------- Event Listeners -----------------------

//open sidebar
openSidebarButton.onclick = function () {
  browser.sidebarAction.open();
  window.close();
};

settingsButton.onclick = async function () {
  let popup = getExtensionPopupWithName("html/settings.html");
  if (popup) {
    await focusWindow(popup.id);
  } else {
    await openPopup("../html/settings.html", 0.6, 0.5);
  }
};

tabsManagerButton.onclick = async function () {
  let popup = getExtensionPopupWithName("html/tabsManager.html");
  if (popup) {
    await focusWindow(popup.id);
  } else {
    await openPopup("../html/tabsManager.html", 0.8, 0.8);
  }
}
