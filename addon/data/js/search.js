'use strict';

/* Constants */
//messages
const HIDE_SEARCH_MSG = 'hide_search';
const SEARCH_MSG = 'search';
const SEARCH_SUGGESTIONS_REQUEST_MSG = 'search_suggestions_request';
const SEARCH_SUGGESTIONS_RESULT_MSG = 'search_suggestions_result';
//preferences
const SHOW_SEARCH_PREF = 'show_search';
//other
const SEARCH_SUGGESTIONS_DELAY = 300;

/**
 * Search module.
 */
var TabTrekkerSearch = {

    googleSearchSuggestions: null,

    /**
     * Initializes search bar.
     */
    initSearch: function(data) {
        if(!data || !data.form || !data.input) {
            return;
        }
        $('#search_form').attr('action', data.form.action);
        $('#search_form').attr('method', data.form.method);
        $('#search_input').attr('name', data.input.name);
        $('#search_input').attr('placeholder', data.input.placeholder);

        TabTrekkerSearch.initTypeahead();
        TabTrekkerSearch.setSearchVisibility(data[SHOW_SEARCH_PREF]);
        TabTrekkerSearch.setInputHoverHandler();
        TabTrekkerSearch.setInputFocusHandler();
        TabTrekkerSearch.setInputChangeHandler();
    },

    /**
     * Initializes typeahead plugin to provide search suggestions.
     */
    initTypeahead: function() {
        //bloodhound suggestion engine
        TabTrekkerSearch.googleSearchSuggestions = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: []
        });
        TabTrekkerSearch.googleSearchSuggestions.initialize();

        //initialize typeahead input
        var options = {
            hint: true,
            highlight: true,
            minLength: 1
        };
        $('#search_input').typeahead(options, {
            displayKey: 'value',
            source: TabTrekkerSearch.googleSearchSuggestions.ttAdapter()
        });
    },

    /**
     * Adds suggestions to the search suggestion index.
     */
    addSearchSuggestions: function(suggestions) {
        //clear index
        TabTrekkerSearch.googleSearchSuggestions.clear();
        if(!suggestions || suggestions.length === 0) {
            return;
        }

        //add suggestions
        suggestions = $.map(suggestions, function(suggestion) {
            return {
                value: suggestion
            };
        });
        TabTrekkerSearch.googleSearchSuggestions.add(suggestions);

        //force dropdown to open
        var val = $('#search_input').typeahead('val');
        $('#search_input').typeahead('val', '');
        $('#search_input').typeahead('val', val);
    },

    /**
     * Sets visibility of the search bar based on user preferences.
     */
    setSearchVisibility: function(visbilityPref) {
        switch(visbilityPref) {
            case 'always':
                $('#search_container').css('display', 'block');
                $('#search_container .hover_item').css('opacity', 1);
                break;
            case 'hover':
                $('#search_container').css('display', 'block');
                break;
            case 'never':
                TabTrekkerSearch.hideSearch();
                break;
        }
    },

    /**
     * Hides the search bar.
     */
    hideSearch: function() {
        $('#search_container').css('display', 'none');
    },

    /**
     * Set search input hover handler.
     */
    setInputHoverHandler: function() {
        $('#search_input').hover(function() {
            $('#search_button').addClass('hover');
        }, function() {
            $('#search_button').removeClass('hover');
        });
    },

    /**
     * Set search input focus handler.
     */
    setInputFocusHandler: function() {
        $('#search_input').focusin(function() {
            $('#search_form').addClass('focus');
            $('#search_button').addClass('focus');
            $('#search_form .twitter-typeahead').addClass('focus');
        }).focusout(function() {
            $('#search_form').removeClass('focus');
            $('#search_button').removeClass('focus');
            $('#search_form .twitter-typeahead').removeClass('focus');
        });
    },

    /**
     * Sets search input change handler.
     */
    setInputChangeHandler: function() {
        $('#search_input').on('input', function() {
            var input = this.value;

            //clear existing timer
            clearTimeout($.data(this, 'timer'));

            //set timer
            var wait = setTimeout(function() {
                TabTrekkerSearch.requestSearchSuggestions(input);
            }, SEARCH_SUGGESTIONS_DELAY);

            //attach timer to input element
            $(this).data('timer', wait);
        });
    },

    /**
     * Requests search suggestions for the given input from the addon.
     */
    requestSearchSuggestions: function(input) {
        self.port.emit(SEARCH_SUGGESTIONS_REQUEST_MSG, input);
    }
};

//listen for messages
self.port.on(HIDE_SEARCH_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerSearch.hideSearch));
self.port.on(SEARCH_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerSearch.initSearch));
self.port.on(SEARCH_SUGGESTIONS_RESULT_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerSearch.addSearchSuggestions));
