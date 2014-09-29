/* SDK Modules */
const globalPrefs = require('sdk/preferences/service');
const pageMod = require("sdk/page-mod");
const simplePrefs = require('sdk/simple-prefs');
const self = require("sdk/self");
const tabs = require('sdk/tabs');

/* Modules */
const time = require('time.js');

/* Constants */
//messages
const SETTINGS_MSG = 'settings';
//preferences
const ENABLED_PREF = 'enabled';
const NEWTAB_PREF = 'browser.newtab.url';
//others
const NEWTAB_FILE = 'newtab.html';

//run on addon load
exports.main = function(options, callbacks) {
    setNewTabUrl();
};

//listen to preference changes
simplePrefs.on(ENABLED_PREF, setNewTabUrl);

/**
 * Sets new tab URL if addon is enabled. 
 * Resets new tab URL if addon is disabled.
 */
function setNewTabUrl() {
    if(simplePrefs.prefs[ENABLED_PREF]) {
        globalPrefs.set(NEWTAB_PREF, self.data.url(NEWTAB_FILE));
    } else {
        globalPrefs.reset(NEWTAB_PREF);
    }
}

//load content scripts
pageMod.PageMod({
    include: self.data.url(NEWTAB_FILE),
    contentScriptFile: [self.data.url('js/jquery-2.1.1.min.js'),
                        self.data.url('js/moment-with-locales.min.js'),
                        self.data.url('js/buttons.js'),
                        self.data.url('js/time.js')],
    onAttach: function(worker) {
        time.initTime(worker);
        attachButtonListeners(worker);
    }
});

/**
 * Attaches listeners to listen for button click events.
 */
function attachButtonListeners(worker) {
    worker.port.on(SETTINGS_MSG, openSettings);
}

/**
 * Opens addon settings page in new tab
 */
function openSettings() {
    tabs.open({
        url: 'about:addons',
        onReady: function(tab) {
            tab.attach({
                contentScriptWhen: 'end',
                contentScript: 'AddonManager.getAddonByID("' + self.id + '", function(aAddon) {\n' + 'unsafeWindow.gViewController.commands.cmd_showItemDetails.doCommand(aAddon, true);\n' + '});\n'
            });
        }
    });
}
