/* SDK Modules */
const simplePrefs = require('sdk/simple-prefs');

/* Constants */
const _24HOUR_PREF = '24hour';
const TIME_MSG = 'time';

/**
 * Initializes time by sending time options to the content scripts.
 */
exports.initTime = function(worker) {
    var options = {};
    options[_24HOUR_PREF] = simplePrefs.prefs[_24HOUR_PREF];
    worker.port.emit(TIME_MSG, options);
}
