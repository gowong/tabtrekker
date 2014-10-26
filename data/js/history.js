/* Constants */
//messages
const HISTORY_MSG = 'history';
const HISTORY_UPDATE_ICON_MSG = 'history_update_icon';

//listen for messages
self.port.on(HISTORY_MSG, initHistory);
self.port.on(HISTORY_UPDATE_ICON_MSG, updateIcon);

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
    var url = result.url;
    var title = result.title || url;
    //small favicon url
    var iconUrl = result.iconUri ? 
        result.iconUri.substring('moz-anno:favicon:'.length) : '';
    //either the small favicon (if there is one) or a generic link icon
    var objectFallback = iconUrl ? $('<span>').css('background-image', 'url(' + iconUrl + ')'): 
        $('<span>').attr('class', 'glyphicon glyphicon-file');

    $('#history_list').append(
        $('<li>').append(
            $('<a>').attr('href', url).append(
                $('<object>').append(
                    objectFallback)).append(
                $('<span>').append(title))
    ));
}

/**
 * Updates the icon of the specified url.
 */
function updateIcon(data) {
    var url = data.url;
    var icon = data.icon;
    if(!url || !icon) {
        return;
    }
    var iconUrl = icon.appleIcon || icon.metaImage || icon.msTile
        || icon.ogImage || icon.relIcon;
    if(!iconUrl) {
        return;
    }

    //resolve relative links
    iconUrl = iconUrl.substring(0, 4) === 'http' ? iconUrl :
        URL.resolve(url, iconUrl);

    //find object inside link list item with specified url
    var object = $('#history_list > li > a[href="' + url + '"]').find('object:first-child');
    //set icon
    $(object).attr('data', iconUrl);
}
