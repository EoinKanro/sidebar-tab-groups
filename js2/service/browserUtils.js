
export async function getAllOpenedTabs() {
  return await browser.tabs.query({});
}
