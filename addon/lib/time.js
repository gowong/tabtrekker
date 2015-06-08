'use strict';

/* SDK Modules */
const simplePrefs = require('sdk/simple-prefs');

/* Modules */
const logger = require('./logger').TabTrekkerLogger;
const utils = require('./utils').TabTrekkerUtils;
var tabtrekker; //load on initialization to ensure main module is loaded

/* Constants */
//messages
const HIDE_TIME_MSG = 'hide_time';
const TIME_MSG = 'time';
//preferences
const SHOW_TIME_PREF = 'show_time';
const TIME_FORMAT_PREF = 'time_format';

/**
 * Time module.
 */
var TabTrekkerTime = {

    /**
     * Initializes time by sending time options to the content scripts.
     */
    initTime: function(worker) {
        tabtrekker = require('./main').TabTrekkerMain;

        //don't initialize time when it is hidden
        var timeVisibility = simplePrefs.prefs[SHOW_TIME_PREF];
        if(timeVisibility === 'never') {
            utils.emit(tabtrekker.workers, worker, HIDE_TIME_MSG);
            return;
        }

        logger.log('Initializing time.');

        var options = {}
        options[TIME_FORMAT_PREF] = simplePrefs.prefs[TIME_FORMAT_PREF];
        options[SHOW_TIME_PREF] = timeVisibility;
        utils.emit(tabtrekker.workers, worker, TIME_MSG, options);
    }
};

exports.TabTrekkerTime = TabTrekkerTime;
