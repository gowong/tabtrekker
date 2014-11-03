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
const HOME_ENABLED_PREF = 'homepage_enabled';
const NEWTAB_ENABLED_PREF = 'newtab_enabled';
const GLOBAL_HOME_PREF = 'browser.startup.homepage';
const GLOBAL_NEWTAB_PREF = 'browser.newtab.url';
//others
const HTML_PAGE = 'newtab.html';

/**
 * Main module.
 */
var NewTabMain = {

    /**
     * Workers associated with new tab pages. 
     */
    workers: [],

    /**
     * Overrides new tab page if addon is enabled. 
     * Resets new tab page if addon is disabled.
     */
    setNewTabPage: function() {
        if(simplePrefs.prefs[NEWTAB_ENABLED_PREF]) {
            logger.log('Overriding new tab page preference.');
            globalPrefs.set(GLOBAL_NEWTAB_PREF, self.data.url(HTML_PAGE));
        } else {
            NewTabMain.resetNewTabPage();
        }
    },

    /**
     * Overrides home page if addon is enabled. 
     * Resets home page if addon is disabled.
     */
    setHomePage: function() {
        if(simplePrefs.prefs[HOME_ENABLED_PREF]) {
            logger.log('Overriding home page preference.');
            globalPrefs.set(GLOBAL_HOME_PREF, self.data.url(HTML_PAGE));
        } else {
            NewTabMain.resetHomePage();
        }
    },

    /**
     * Resets new tab page preference to its default value.
     */
    resetNewTabPage: function() {
        logger.log('Restoring new tab page preference.');
        globalPrefs.reset(GLOBAL_NEWTAB_PREF);
    },

    /**
     * Resets home page preference to its default value.
     */
    resetHomePage: function() {
        logger.log('Restoring home page preference.');
        globalPrefs.reset(GLOBAL_HOME_PREF);
    }
};

//on addon load
exports.main = function(options, callbacks) {
    NewTabMain.setNewTabPage();
    NewTabMain.setHomePage();
};

//on addon unload
exports.onUnload = function(reason) {
    NewTabMain.resetNewTabPage();
    NewTabMain.resetHomePage();
};

//listen to preference changes
simplePrefs.on(NEWTAB_ENABLED_PREF, NewTabMain.setNewTabPage);
simplePrefs.on(HOME_ENABLED_PREF, NewTabMain.setHomePage);

//load content scripts
pageMod.PageMod({
    include: self.data.url(HTML_PAGE),
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
