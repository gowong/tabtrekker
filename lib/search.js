/* SDK Modules */
const _ = require('sdk/l10n').get;
const simplePrefs = require('sdk/simple-prefs');

/* Modules */
const logger = require('logger.js');

/* Constants */
//messages
const HIDE_SEARCH_MSG = 'hide_search';
const SEARCH_MSG = 'search';
//preferences
const SHOW_SEARCH_PREF = 'show_search';

/**
 * Initializes search by sending search options to the content scripts.
 */
exports.initSearch = function(worker) {
    //don't initialize search when it is hidden
    var searchVisibility = simplePrefs.prefs[SHOW_SEARCH_PREF];
    if(searchVisibility === 'never') {
        worker.port.emit(HIDE_SEARCH_MSG);
        return;
    }

    logger.log('Initializing search.');

    var options = {
        form: {
            action: getFormAction(),
            method: getFormMethod()
        }, input: {
            placeholder: getPlaceholder()
        }
    };
    options[SHOW_SEARCH_PREF] = simplePrefs.prefs[SHOW_SEARCH_PREF];
    worker.port.emit(SEARCH_MSG, options);
}

/**
 * Returns appropriate search input placeholder based on user preferences.
 */
 function getPlaceholder() {
    return _('search_google');
 }

 /**
  * Returns appropriate search form action based on user preferences.
  */
 function getFormAction() {
    return 'https://www.google.com/search';
 }

 /**
  * Returns appropriate search form method based on user preferences.
  */
 function getFormMethod() {
    return 'get';
 }
