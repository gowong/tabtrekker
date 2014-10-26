/* SDK Modules */
const _ = require('sdk/l10n').get;
const simplePrefs = require('sdk/simple-prefs');
const Request = require('sdk/request').Request;

/* Modules */
const logger = require('logger.js').Logger;

/* Constants */
//messages
const HIDE_SEARCH_MSG = 'hide_search';
const SEARCH_MSG = 'search';
const SEARCH_SUGGESTIONS_REQUEST_MSG = 'search_suggestions_request';
const SEARCH_SUGGESTIONS_RESULT_MSG = 'search_suggestions_result';
//preferences
const SHOW_SEARCH_PREF = 'show_search';
const SEARCH_ENGINE_PREF = 'search_engine';

/**
 * Search module.
 */
var Search = {
    /**
     * Initializes search by sending search options to the content scripts.
     */
    initSearch: function(worker) {
        //don't initialize search when it is hidden
        var searchVisibility = simplePrefs.prefs[SHOW_SEARCH_PREF];
        if(searchVisibility === 'never') {
            worker.port.emit(HIDE_SEARCH_MSG);
            return;
        }

        logger.log('Initializing search.');

        var options = {
            form: {
                action: Search.getFormAction(),
                method: Search.getFormMethod()
            }, input: {
                name: Search.getInputName(),
                placeholder: Search.getInputPlaceholder()
            }
        };
        options[SHOW_SEARCH_PREF] = simplePrefs.prefs[SHOW_SEARCH_PREF];
        worker.port.emit(SEARCH_MSG, options);

        //listen for search suggestion requests
        worker.port.on(SEARCH_SUGGESTIONS_REQUEST_MSG, function(input) {
            Search.getSearchSuggestions(worker, input);
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
     * Requests Google search suggestions for the given input.
     */
    getSearchSuggestions: function(worker, input) {
        if(!input || !input.trim()) {
            worker.port.emit(SEARCH_SUGGESTIONS_RESULT_MSG, null);
            return;
        }

        logger.log('Requesting search suggestions for ' + input);

        var url = 'http://suggestqueries.google.com/complete/search?client=firefox&q=' + input;
        Request({
            url: url,
            onComplete: function(response) {
                var suggestions = JSON.parse(response.text);
                //send suggestions to content scripts
                worker.port.emit(SEARCH_SUGGESTIONS_RESULT_MSG, suggestions[1]);
            }
        }).get();
    }
};

exports.Search = Search;
