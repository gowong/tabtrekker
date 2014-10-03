/* SDK Modules */
const simplePrefs = require('sdk/simple-prefs');

/* Modules */
const logger = require('logger.js');

/* Constants */
//messages
const TIME_MSG = 'time';
//preferences
const _24HOUR_PREF = '24hour';
const SHOW_TIME_PREF = 'show_time';

/**
 * Initializes time by sending time options to the content scripts.
 */
exports.initTime = function(worker) {
    //don't initialize time when it is hidden
    var timeVisibility = simplePrefs.prefs[SHOW_TIME_PREF];
    if(timeVisibility === 'never') {
        return;
    }

    logger.log('Initializing time.');

    var options = {}
    options[_24HOUR_PREF] = simplePrefs.prefs[_24HOUR_PREF];
    options[SHOW_TIME_PREF] = simplePrefs.prefs[SHOW_TIME_PREF];
    worker.port.emit(TIME_MSG, options);
}
