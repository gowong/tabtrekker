'use strict';

/* SDK Modules */
const _ = require('sdk/l10n').get;
const simplePrefs = require('sdk/simple-prefs');
const Request = require('sdk/request').Request;

/* Modules */
const logger = require('logger.js').NewTabLogger;
const utils = require('utils.js').NewTabUtils;
var newtab; //load on initialization to ensure main module is loaded

/* Constants */
//messages
const HIDE_SEARCH_MSG = 'hide_search';
const SEARCH_MSG = 'search';
const SEARCH_SUGGESTIONS_REQUEST_MSG = 'search_suggestions_request';
const SEARCH_SUGGESTIONS_RESULT_MSG = 'search_suggestions_result';
//preferences
const SHOW_SEARCH_PREF = 'show_search';
const SEARCH_ENGINE_PREF = 'search_engine';
//otheres
const SEARCH_SUGGESTIONS_URL = 'http://suggestqueries.google.com/complete/search?client=firefox&q=';

/**
 * Search module.
 */
var NewTabSearch = {

    /**
     * Initializes search by sending search options to the content scripts.
     */
    initSearch: function(worker) {
        newtab = require('main.js').NewTabMain;
        
        //don't initialize search when it is hidden
        var searchVisibility = simplePrefs.prefs[SHOW_SEARCH_PREF];
        if(searchVisibility == 'never') {
            utils.emit(newtab.workers, worker, HIDE_SEARCH_MSG);
            return;
        }

        logger.log('Initializing search.');

        var options = {
            form: {
                action: NewTabSearch.getFormAction(),
                method: NewTabSearch.getFormMethod()
            }, input: {
                name: NewTabSearch.getInputName(),
                placeholder: NewTabSearch.getInputPlaceholder()
            }
        };
        options[SHOW_SEARCH_PREF] = simplePrefs.prefs[SHOW_SEARCH_PREF];
        utils.emit(newtab.workers, worker, SEARCH_MSG, options);

        //listen for search suggestion requests
        worker.port.on(SEARCH_SUGGESTIONS_REQUEST_MSG, function(input) {
            NewTabSearch.sendSearchSuggestions(worker, input);
        });
    },

     /**
      * Returns appropriate search form action based on user preferences.
      */
    getFormAction: function() {
        var searchEnginePref = simplePrefs.prefs[SEARCH_ENGINE_PREF];
        switch(searchEnginePref) {
            case 'bing':
                return 'https://bing.com/search';
            case 'google':
                return 'https://google.com/search';
            case 'yahoo':
                return 'https://search.yahoo.com/search';
        }
    },

     /**
      * Returns appropriate search form method based on user preferences.
      */
    getFormMethod: function() {
        var searchEnginePref = simplePrefs.prefs[SEARCH_ENGINE_PREF];
        switch(searchEnginePref) {
            case 'bing':
            case 'google':
            case 'yahoo':
                return 'get';
        }
    },

     /**
      * Returns appropriate search input name based on user preferences.
      */
    getInputName: function() {
        var searchEnginePref = simplePrefs.prefs[SEARCH_ENGINE_PREF];
        switch(searchEnginePref) {
            case 'bing':
            case 'google':
                return 'q';
            case 'yahoo':
                return 'p';
        }
    },

    /**
     * Returns appropriate search input placeholder based on user preferences.
     */
    getInputPlaceholder: function() {
        var searchEnginePref = simplePrefs.prefs[SEARCH_ENGINE_PREF];
        switch(searchEnginePref) {
            case 'bing':
                return _('search_bing');
            case 'google':
                return _('search_google');
            case 'yahoo':
                return _('search_yahoo');
        }
    },

    /**
     * Requests Google search suggestions for the given input and sends them
     * to content scripts.
     */
    sendSearchSuggestions: function(worker, input) {
        if(!input || !input.trim()) {
            utils.emit(newtab.workers, worker, SEARCH_SUGGESTIONS_RESULT_MSG, null);
            return;
        }

        logger.log('Requesting search suggestions for ' + input);

        var url = SEARCH_SUGGESTIONS_URL + input;
        Request({
            url: url,
            onComplete: function(response) {
                var suggestions = JSON.parse(response.text);
                //send suggestions to content scripts
                utils.emit(newtab.workers, worker, 
                    SEARCH_SUGGESTIONS_RESULT_MSG, suggestions[1]);
            }
        }).get();
    }
};

exports.NewTabSearch = NewTabSearch;
