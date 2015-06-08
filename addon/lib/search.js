'use strict';

/* SDK Modules */
const _ = require('sdk/l10n').get;
const simplePrefs = require('sdk/simple-prefs');
const Request = require('sdk/request').Request;

/* Modules */
const logger = require('./logger').TabTrekkerLogger;
const utils = require('./utils').TabTrekkerUtils;
var tabtrekker; //load on initialization to ensure main module is loaded

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
var TabTrekkerSearch = {

    /**
     * Initializes search by sending search options to the content scripts.
     */
    initSearch: function(worker) {
        tabtrekker = require('./main').TabTrekkerMain;
        
        //don't initialize search when it is hidden
        var searchVisibility = simplePrefs.prefs[SHOW_SEARCH_PREF];
        if(searchVisibility === 'never') {
            utils.emit(tabtrekker.workers, worker, HIDE_SEARCH_MSG);
            return;
        }

        logger.log('Initializing search.');

        var options = {
            form: {
                action: TabTrekkerSearch.getFormAction(),
                method: TabTrekkerSearch.getFormMethod()
            }, input: {
                name: TabTrekkerSearch.getInputName(),
                placeholder: TabTrekkerSearch.getInputPlaceholder()
            }
        };
        options[SHOW_SEARCH_PREF] = searchVisibility;
        utils.emit(tabtrekker.workers, worker, SEARCH_MSG, options);

        //listen for search suggestion requests
        worker.port.on(SEARCH_SUGGESTIONS_REQUEST_MSG, function(input) {
            TabTrekkerSearch.sendSearchSuggestions(worker, input);
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
            case 'duckduckgo':
                return 'https://duckduckgo.com/';
            case 'google':
                return 'https://google.com/search';
            case 'yahoo':
                return 'https://search.yahoo.com/search';
            default:
                return '';
        }
    },

     /**
      * Returns appropriate search form method based on user preferences.
      */
    getFormMethod: function() {
        var searchEnginePref = simplePrefs.prefs[SEARCH_ENGINE_PREF];
        switch(searchEnginePref) {
            case 'bing':
            case 'duckduckgo':
            case 'google':
            case 'yahoo':
            default:
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
            case 'duckduckgo':
            case 'google':
                return 'q';
            case 'yahoo':
                return 'p';
            default:
                return '';
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
            case 'duckduckgo':
                return _('search_duckduckgo');
            case 'google':
                return _('search_google');
            case 'yahoo':
                return _('search_yahoo');
            default:
                return '';
        }
    },

    /**
     * Requests Google search suggestions for the given input and sends them
     * to content scripts.
     */
    sendSearchSuggestions: function(worker, input) {
        if(!input || !input.trim()) {
            utils.emit(tabtrekker.workers, worker, SEARCH_SUGGESTIONS_RESULT_MSG, null);
            return;
        }

        logger.log('Requesting search suggestions for ' + input);

        var url = SEARCH_SUGGESTIONS_URL + input;
        Request({
            url: url,
            onComplete: function(response) {
                if(response.status != 200) {
                    logger.error('Search suggestions request failed.', response);
                    return;
                }
                var suggestions = response.json;
                //send suggestions to content scripts
                utils.emit(tabtrekker.workers, worker, 
                    SEARCH_SUGGESTIONS_RESULT_MSG, suggestions[1]);
            }
        }).get();
    }
};

exports.TabTrekkerSearch = TabTrekkerSearch;
