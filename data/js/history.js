/* Constants */
//messages
const HISTORY_MSG = 'history';

//listen for messages
self.port.on(HISTORY_MSG, initHistory);

/**
 * Initializes history results.
 */
function initHistory(results) {
    //append each result to history list
    for(var i = 0; i < results.length; i++) {
        appendHistoryResult(results[i]);
    }
}

/**
 * Appends history link's title, url, and favicon to list of history results.
 */
function appendHistoryResult(result) {
    var title = result.title;
    var url = result.url;
    //small favicon url
    var iconUrl = result.iconUri ? 
        result.iconUri.substring('moz-anno:favicon:'.length) : '';

    $('#history_list').append(
        $('<li>').append(
            $('<a>').attr('href', url).append(
                $('<object>').attr('data', iconUrl).append(
                    $('<span>').attr('class', 'glyphicon glyphicon-link'))).append(
                $('<span>').append(title))
    ));
}
