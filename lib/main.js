/* SDK Modules */
const globalPrefs = require('sdk/preferences/service');
const simplePrefs = require('sdk/simple-prefs');
const self = require("sdk/self");
/* Modules */
const logger = require('./logger.js');

/* Constants */
const ENABLED_PREF = 'enabled';
const NEWTAB_PREF = 'browser.newtab.url';
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
