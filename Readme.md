# Sidebar Tab Groups

It's an addon for Firefox. With it you can manage your tabs
via tab groups in sidebar.

I was inspired by Opera GX sidebar and wanted something
similar in Firefox

## How to make it pretty

Default sidebar is too big. So to make it tiny like icon width
you need:


### Create userChrome.css

- Open about:support
- Open profile folder
- Create chrome folder
- Create userChrome.css inside it
- Put the code inside the file:

```
/* Hide the default Firefox sidebar header */
#sidebar-header {
    display: none !important;
}

/* Adjust the minimum width of the sidebar */
#sidebar-box {
    min-width: 37px !important; /* Set your desired minimum width */
    max-width: 37px !important; /* Set your desired maximum width */
}

/* Set a specific width for the sidebar */
#sidebar {
    width: 37px !important; /* Set your desired width */
}
```

### Turn the style on

- Open about:config
- Type userprof in the search bar
- Double-click on toolkit.legacyUserProfileCustomizations.stylesheets to switch it on
- Restart Firefox
