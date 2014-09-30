/* SDK Modules */
const globalPrefs = require('sdk/preferences/service');
const pageMod = require('sdk/page-mod');
const simplePrefs = require('sdk/simple-prefs');
const self = require('sdk/self');

/* Modules */
const menu = require('menu.js');
const time = require('time.js');
const weather = require('weather.js');

/* Constants */
//preferences
const ENABLED_PREF = 'enabled';
const NEWTAB_PREF = 'browser.newtab.url';
//others
const NEWTAB_FILE = 'newtab.html';

//listen to preference changes
simplePrefs.on(ENABLED_PREF, setNewTabUrl);

//run on addon load
exports.main = function(options, callbacks) {
    setNewTabUrl();
};

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
                        self.data.url('js/menu.js'),
                        self.data.url('js/time.js'),
                        self.data.url('js/weather.js')],
    onAttach: function(worker) {
        time.initTime(worker);
        weather.initWeather(worker);
        menu.attachListeners(worker);
    }
});
