/* SDK Modules */
const globalPrefs = require('sdk/preferences/service');
const pageMod = require('sdk/page-mod');
const simplePrefs = require('sdk/simple-prefs');
const self = require('sdk/self');

/* Modules */
const history = require('history.js');
const logger = require('logger.js');
const menu = require('menu.js');
const search = require('search.js');
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

//on addon load
exports.main = function(options, callbacks) {
    setNewTabUrl();
};

//on addon unload
exports.onUnload = function(reason) {
    resetNewTabUrl();
};

/**
 * Sets new tab URL if addon is enabled. 
 * Resets new tab URL if addon is disabled.
 */
function setNewTabUrl() {
    if(simplePrefs.prefs[ENABLED_PREF]) {
        logger.log('Overriding new tab preference.');
        globalPrefs.set(NEWTAB_PREF, self.data.url(NEWTAB_FILE));
    } else {
        resetNewTabUrl();
    }
}

/**
 * Resets new tab URL to default preference.
 */
function resetNewTabUrl() {
    logger.log('Restoring new tab preference.');
    globalPrefs.reset(NEWTAB_PREF);
}

//load content scripts
pageMod.PageMod({
    include: self.data.url(NEWTAB_FILE),
    contentScriptFile: [self.data.url('js/jquery-2.1.1.min.js'),
                        self.data.url('js/bootstrap.min.js'),
                        self.data.url('js/moment-with-locales.min.js'),
                        self.data.url('js/typeahead.bundle.min.js'),
                        self.data.url('js/url-min.js'),
                        self.data.url('js/history.js'),
                        self.data.url('js/menu.js'),
                        self.data.url('js/search.js'),
                        self.data.url('js/time.js'),
                        self.data.url('js/weather.js')],
    onAttach: function(worker) {
        history.initHistory(worker);
        menu.attachListeners(worker);
        search.initSearch(worker);
        time.initTime(worker);
        weather.initWeather(worker);
    }
});
