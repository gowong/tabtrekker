/* SDK Modules */
const global_prefs = require('sdk/preferences/service');
const simple_prefs = require('sdk/simple-prefs');
const prefs = simple_prefs.prefs;
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
simple_prefs.on(ENABLED_PREF, setNewTabUrl);

/**
 * Sets new tab URL if addon is enablaed. 
 * Resets new tab URL if addon is disabled.
 */
function setNewTabUrl() {
    if(prefs.enabled) {
        global_prefs.set(NEWTAB_PREF, self.data.url(NEWTAB_FILE));
    } else {
        global_prefs.reset(NEWTAB_PREF);
    }
}
