'use strict';

/* SDK Modules */
const globalPrefs = require('sdk/preferences/service');
const pageMod = require('sdk/page-mod');
const simplePrefs = require('sdk/simple-prefs');
const self = require('sdk/self');

/* Modules */
const history = require('./history').TabTrekkerHistory;
const images = require('./images').TabTrekkerImages;
const logger = require('./logger').TabTrekkerLogger;
const menu = require('./menu').TabTrekkerMenu;
const search = require('./search').TabTrekkerSearch;
const time = require('./time').TabTrekkerTime;
const utils = require('./utils').TabTrekkerUtils;
const weather = require('./weather').TabTrekkerWeather;

/* Constants */
//preferences
const HOME_ENABLED_PREF = 'homepage_enabled';
const NEWTAB_ENABLED_PREF = 'newtab_enabled';
const GLOBAL_HOME_PREF = 'browser.startup.homepage';
const GLOBAL_NEWTAB_PREF = 'browser.newtab.url';
//others
const HTML_PAGE = 'tabtrekker.html';

/**
 * Main module.
 */
var TabTrekkerMain = {

    /**
     * Workers associated with TabTrekker pages. 
     */
    workers: [],

    /**
     * Overrides new tab page if addon is enabled. 
     * Resets new tab page if addon is disabled.
     */
    setNewTabPage: function(keepExistingPage) {
        if(simplePrefs.prefs[NEWTAB_ENABLED_PREF]) {
            logger.log('Overriding new tab page preference.');
            // Use NewTabURL module in Firefox 41+
            var newTabUrl = TabTrekkerMain.getNewTabUrlModule();
            if(newTabUrl) {
                newTabUrl.override(self.data.url(HTML_PAGE));
            }
            // Set new tab url preference
            else {
                globalPrefs.set(GLOBAL_NEWTAB_PREF, self.data.url(HTML_PAGE));
            }
        } else if(!keepExistingPage) {
            TabTrekkerMain.resetNewTabPage();
        }
    },

    /**
     * Overrides home page if addon is enabled. 
     * Resets home page if addon is disabled.
     */
    setHomePage: function(keepExistingPage) {
        if(simplePrefs.prefs[HOME_ENABLED_PREF]) {
            logger.log('Overriding home page preference.');
            globalPrefs.set(GLOBAL_HOME_PREF, self.data.url(HTML_PAGE));
        } else if(!keepExistingPage) {
            TabTrekkerMain.resetHomePage();
        }
    },

    /**
     * Resets new tab page preference to its default value.
     */
    resetNewTabPage: function() {
        logger.log('Restoring new tab page preference.');
        // Use NewTabURL module in Firefox 41+
        var newTabUrl = TabTrekkerMain.getNewTabUrlModule();
        if(newTabUrl) {
            newTabUrl.reset();
        }
        // Set new tab url preference
        else {
            globalPrefs.reset(GLOBAL_NEWTAB_PREF);
        }
    },

    /**
     * Resets home page preference to its default value.
     */
    resetHomePage: function() {
        logger.log('Restoring home page preference.');
        globalPrefs.reset(GLOBAL_HOME_PREF);
    },

    /**
     * Returns the NewTabURL module if present (only available on Firefox 41+).
     */
    getNewTabUrlModule: function() {
        try {
            return require('resource:///modules/NewTabURL.jsm').NewTabURL;
        } catch (e) {
            return null;
        }
    }
};

//on addon load
exports.main = function(options, callbacks) {
    TabTrekkerMain.setNewTabPage(true);
    TabTrekkerMain.setHomePage(true);
};

//on addon unload
exports.onUnload = function(reason) {
    // Only reset new tab and home pages if the addon is being uninstalled
    // or disabled
    if(reason !== 'shutdown') {
        TabTrekkerMain.resetNewTabPage();
        TabTrekkerMain.resetHomePage();
    }
};

//listen to preference changes
simplePrefs.on(NEWTAB_ENABLED_PREF, function() { TabTrekkerMain.setNewTabPage(false); });
simplePrefs.on(HOME_ENABLED_PREF, function() { TabTrekkerMain.setHomePage(false); });

//load content scripts
pageMod.PageMod({
    include: self.data.url(HTML_PAGE),
    contentScriptFile: [self.data.url('js/jquery-2.1.3.min.js'),
                        self.data.url('js/bootstrap.min.js'),
                        self.data.url('js/moment-with-locales.min.js'),
                        self.data.url('js/typeahead.bundle.min.js'),
                        self.data.url('js/url-min.js'),
                        self.data.url('js/utils.js'),
                        self.data.url('js/history.js'),
                        self.data.url('js/images.js'),
                        self.data.url('js/menu.js'),
                        self.data.url('js/search.js'),
                        self.data.url('js/time.js'),
                        self.data.url('js/weather.js')],
    attachTo: ['existing', 'top'],
    onAttach: function(worker) {
        //immediately add worker
        utils.addWorker(TabTrekkerMain.workers, worker);
        
        //add worker on page show
        worker.on('pageshow', function() { utils.addWorker(TabTrekkerMain.workers, this); });
        
        //remove workers when page is removed or hidden
        worker.on('pagehide', function() { utils.removeWorker(TabTrekkerMain.workers, this); });
        worker.on('detach', function() { utils.removeWorker(TabTrekkerMain.workers, this); });
        
        //initialize modules
        history.initHistory(worker);
        images.initImages(worker);
        menu.initMenu(worker);
        search.initSearch(worker);
        time.initTime(worker);
        weather.initWeather(worker);
    }
});

exports.TabTrekkerMain = TabTrekkerMain;
