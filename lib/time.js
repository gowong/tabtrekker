/* SDK Modules */
const simplePrefs = require('sdk/simple-prefs');

/* Modules */
const logger = require('logger.js');

/* Constants */
const _24HOUR_PREF = '24hour';
const TIME_MSG = 'time';

/**
 * Initializes time by sending time options to the content scripts.
 */
exports.initTime = function(worker) {
    logger.log('Initializing time.');

    var options = {}
    options[_24HOUR_PREF] = simplePrefs.prefs[_24HOUR_PREF];
    worker.port.emit(TIME_MSG, options);
}
