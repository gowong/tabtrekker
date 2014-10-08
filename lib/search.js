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
const SEARCH_ENGINE_PREF = 'search_engine';

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
            name: getInputName(),
            placeholder: getInputPlaceholder()
        }
    };
    options[SHOW_SEARCH_PREF] = simplePrefs.prefs[SHOW_SEARCH_PREF];
    worker.port.emit(SEARCH_MSG, options);
}

 /**
  * Returns appropriate search form action based on user preferences.
  */
 function getFormAction() {
    var searchEnginePref = simplePrefs.prefs[SEARCH_ENGINE_PREF];
    switch(searchEnginePref) {
        case 'bing':
            return 'https://bing.com/search';
        case 'google':
            return 'https://google.com/search';
        case 'yahoo':
            return 'https://search.yahoo.com/search';
    }
 }

 /**
  * Returns appropriate search form method based on user preferences.
  */
 function getFormMethod() {
    var searchEnginePref = simplePrefs.prefs[SEARCH_ENGINE_PREF];
    switch(searchEnginePref) {
        case 'bing':
        case 'google':
        case 'yahoo':
            return 'get';
    }
 }

 /**
  * Returns appropriate search input name based on user preferences.
  */
 function getInputName() {
    var searchEnginePref = simplePrefs.prefs[SEARCH_ENGINE_PREF];
    switch(searchEnginePref) {
        case 'bing':
        case 'google':
            return 'q';
        case 'yahoo':
            return 'p';
    }
 }

/**
 * Returns appropriate search input placeholder based on user preferences.
 */
 function getInputPlaceholder() {
    var searchEnginePref = simplePrefs.prefs[SEARCH_ENGINE_PREF];
    switch(searchEnginePref) {
        case 'bing':
            return _('search_bing');
        case 'google':
            return _('search_google');
        case 'yahoo':
            return _('search_yahoo');
    }
 }

