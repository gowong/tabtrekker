'use strict';

/* SDK Modules */
const globalPrefs = require('sdk/preferences/service');
const pageMod = require('sdk/page-mod');
const simplePrefs = require('sdk/simple-prefs');
const self = require('sdk/self');

/* Modules */
const history = require('history.js').NewTabHistory;
const logger = require('logger.js').NewTabLogger;
const menu = require('menu.js').NewTabMenu;
const search = require('search.js').NewTabSearch;
const time = require('time.js').NewTabTime;
const utils = require('utils.js').NewTabUtils;
const weather = require('weather.js').NewTabWeather;

/* Constants */
//preferences
const ENABLED_PREF = 'enabled';
const NEWTAB_PREF = 'browser.newtab.url';
//others
const NEWTAB_FILE = 'newtab.html';

/**
 * Main module.
 */
var NewTabMain = {

    /**
     * Workers associated with new tab pages. 
     */
    workers: [],

    /**
     * Sets new tab URL if addon is enabled. 
     * Resets new tab URL if addon is disabled.
     */
    setNewTabUrl: function() {
        if(simplePrefs.prefs[ENABLED_PREF]) {
            logger.log('Overriding new tab preference.');
            globalPrefs.set(NEWTAB_PREF, self.data.url(NEWTAB_FILE));
        } else {
            NewTabMain.resetNewTabUrl();
        }
    },

    /**
     * Resets new tab URL to default preference.
     */
    resetNewTabUrl: function() {
        logger.log('Restoring new tab preference.');
        globalPrefs.reset(NEWTAB_PREF);
    }
};

//on addon load
exports.main = function(options, callbacks) {
    NewTabMain.setNewTabUrl();
};

//on addon unload
exports.onUnload = function(reason) {
    NewTabMain.resetNewTabUrl();
};

//listen to preference changes
simplePrefs.on(ENABLED_PREF, NewTabMain.setNewTabUrl);

//load content scripts
pageMod.PageMod({
    include: self.data.url(NEWTAB_FILE),
    contentScriptFile: [self.data.url('js/jquery-2.1.1.min.js'),
                        self.data.url('js/bootstrap.min.js'),
                        self.data.url('js/moment-with-locales.min.js'),
                        self.data.url('js/typeahead.bundle.min.js'),
                        self.data.url('js/url-min.js'),
                        self.data.url('js/utils.js'),
                        self.data.url('js/history.js'),
                        self.data.url('js/menu.js'),
                        self.data.url('js/search.js'),
                        self.data.url('js/time.js'),
                        self.data.url('js/weather.js')],
    onAttach: function(worker) {
        //immediately add worker
        utils.addWorker(NewTabMain.workers, worker);
        
        //add worker on page show
        worker.on('pageshow', function() { utils.addWorker(NewTabMain.workers, this); });
        
        //remove workers when page is removed or hidden
        worker.on('pagehide', function() { utils.removeWorker(NewTabMain.workers, this); });
        worker.on('detach', function() { utils.removeWorker(NewTabMain.workers, this); });
        
        //initialize modules
        history.initHistory(worker);
        menu.attachListeners(worker);
        search.initSearch(worker);
        time.initTime(worker);
        weather.initWeather(worker);
    }
});

exports.NewTabMain = NewTabMain;
