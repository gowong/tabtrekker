/* SDK Modules */
const globalPrefs = require('sdk/preferences/service');
const simplePrefs = require('sdk/simple-prefs');
const self = require("sdk/self");
const pageMod = require("sdk/page-mod");

/* Constants */
const ENABLED_PREF = 'enabled';
const _24HOUR_PREF = '24hour';
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

/**
 * Sends the value of the 24-hour clock preference to the content scripts.
 */
function notify24hourPref(worker) {
    worker.port.emit('time_24hour', simplePrefs.prefs[_24HOUR_PREF]);
}

//load content scripts
pageMod.PageMod({
    include: self.data.url(NEWTAB_FILE),
    contentScriptFile: [self.data.url('js/jquery-2.1.1.min.js'),
                        self.data.url('js/moment-with-locales.min.js'),
                        self.data.url('js/time.js')],
    onAttach: notify24hourPref
});
