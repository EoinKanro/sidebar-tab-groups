
/**
 * Responsible for:
 * - any tabs manipulations. active group saves only here
 * - backup
 * - removing context elements
 */

//------------------------- Runtime messages listener --------------------------------

async function processUpdateActiveGroup(group) {
    if (activeGroup) {
        activeGroup.name = group.name;
        activeGroup.icon = group.icon;
        activeGroup.index = group.index;
        await save();
    } else {
        activeGroup = group;
        await saveActiveGroupId(group.id);
        notify(new SidebarUpdateActiveGroupButtonEvent());
    }
}

async function processRestoreBackup(json) {
    await backupGroups();

    await deleteAllGroups();
    await cleanTempData();

    for (const item of json.allGroups) {
        await saveGroup(item);
    }

    await openFirstGroup();

    try {
        await saveSetting(json.enableBackup, async () => await saveEnableBackup(json.enableBackup));
        await saveSetting(json.backupMinutes, async () => await saveBackupMinutes(Number(json.backupMinutes)));
        await saveSetting(json.sidebarButtonsPaddingPx, async () => await saveSidebarButtonsPaddingPx(Number(json.sidebarButtonsPaddingPx)));
        await saveSetting(json.tabsBehaviorOnChangeGroup, async () => await saveTabsBehaviorOnChangeGroup(json.tabsBehaviorOnChangeGroup));

        await cleanInitBackupInterval();
        notify(new SidebarUpdateButtonsPadding());
    } catch (e) {
        console.warn("Can't restore settings", json);
    }
}

async function saveSetting(param, saveFunction) {
    if (param !== undefined && param !== null) {
        await saveFunction();
    }
}
