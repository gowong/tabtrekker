/* Constants */
//messages
const HIDE_SEARCH_MSG = 'hide_search';
const SEARCH_MSG = 'search';
//preferences
const SHOW_SEARCH_PREF = 'show_search';

//listen for messages
self.port.on(HIDE_SEARCH_MSG, hideSearch);
self.port.on(SEARCH_MSG, initSearch);

/**
 * Initializes search bar.
 */
function initSearch(data) {
    if(!data || !data.form || !data.input) {
        return;
    }
    $('#search_form').attr('action', data.form.action);
    $('#search_form').attr('method', data.form.method);
    $('#search_input').attr('name', data.input.name);
    $('#search_input').attr('placeholder', data.input.placeholder);

    setSearchVisibility(data[SHOW_SEARCH_PREF]);
    setInputFocusHandler();
}

/**
 * Sets visibility of the search bar based on user preferences.
 */
function setSearchVisibility(visbilityPref) {
    switch(visbilityPref) {
        case 'always':
            $('#search_container').css('display', 'block');
            $('#search_container .hover_item').css('opacity', 1);
            break;
        case 'hover':
            $('#search_container').css('display', 'block');
            break;
        case 'never':
            hideSearch();
            break;
    }
}

/**
 * Hides the search bar.
 */
function hideSearch() {
    $('#search_container').css('display', 'none');
 }

/**
 * Set search input focus handler.
 */
function setInputFocusHandler() {
    $('#search_input').focusin(function() {
        $('#search_form').addClass('focused');
    }).focusout(function() {
        $('#search_form').removeClass('focused');
    });
}
