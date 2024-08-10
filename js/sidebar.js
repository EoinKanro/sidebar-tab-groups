import {TabsGroup, saveGroup, getGroupName, getAllTabs, saveCurrentGroup, getGroup, getCurrentGroup} from "./tabsGroup.js";

class Tab {
    constructor(id, url) {
        this.id = id;
        this.url = url;
    }
}

await saveCurrentGroup(null);

// Event listener for creating a new group
document.getElementById('create-group').addEventListener('click', clickCreateNewGroup);

async function clickCreateNewGroup() {
    //todo popup

    const currentGroup = await getCurrentGroup();

    let newGroup;
    if (!currentGroup) {
        //save current tabs to new group if there is no currentGroup
        const allTabs = await getAllTabs();

        newGroup = new TabsGroup(new Date().getTime(),
            "title",
            "check_box",
            allTabs.map(tab => new Tab(tab.id, tab.url))
        );
    } else {
        newGroup = new TabsGroup(new Date().getTime(),
            "title",
            "check_box",
            []
        );
    }

    //save group to storage and create button
    await saveGroup(newGroup);
    await createButton(newGroup);

    //set active if there is no active group
    if (!currentGroup) {
        await saveCurrentGroup(newGroup);
    }
}

async function createButton(group) {
    //todo colors
    const tabButtons = document.getElementById('tab-buttons');

    const button = document.createElement('button');
    button.title=group.name;
    button.classList.add('button-class');

    const span = document.createElement('span');
    span.classList.add('material-symbols-outlined');
    span.textContent = group.icon;

    button.appendChild(span);

    //open tabs of group on click
    button.addEventListener('click', async () => {
        const groupToOpen = await getGroup(getGroupName(group));
        console.log(groupToOpen);
        await openTabs(groupToOpen);
    });

    //add button
    tabButtons.appendChild(button);
}

// Open the tabs of selected group
async function openTabs(group) {
    //save null to prevent updating group in background
    await saveCurrentGroup(null);

    //filter unsupported links
    group.tabs = group.tabs
        .filter(tab => !tab.url.startsWith("about:") || tab.url === "about:blank")
        .map(tab => tab);

    //create empty tab in empty group
    if (group.tabs.length <= 0) {
        group.tabs.push(new Tab(0, "about:blank"));
    }

    //open all tabs from group and save ids
    for (const tab of group.tabs) {
        const createdTab = await browser.tabs.create({
            url: tab.url
        });
        tab.id = createdTab.id;
    }

    //close old tabs
    const openedIds = group.tabs.map(tab => tab.id);
    const allTabs = await getAllTabs();
    const idsToClose = allTabs
        .filter(tab => !openedIds.includes(tab.id))
        .map(tab => tab.id);
    await browser.tabs.remove(idsToClose);

    //save for performing update in background
    await saveCurrentGroup(group);
}

// Load and display existing tab groups when the sidebar opens
browser.storage.local.get().then((groups) => {
    for (const id in groups) {
        if (id.startsWith("group-")) {
            createButton(groups[id]);
        }
    }
});
