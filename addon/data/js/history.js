'use strict';

/* Constants */
//messages
const HISTORY_MSG = 'history';
const HISTORY_UPDATE_ICON_MSG = 'history_update_icon';
//other
const ICON_MIN_WIDTH = 56;
const ICON_MIN_HEIGHT = 56;

/**
 * History module.
 */
var TabTrekkerHistory = {

    /**
     * Initializes history results.
     */
    initHistory: function(results) {
        //append each result to history list
        for(var i = 0; i < results.length; i++) {
            TabTrekkerHistory.appendHistoryResult(results[i]);
        }
    },

    /**
     * Appends history link's title, url, and favicon to list of history results.
     */
    appendHistoryResult: function(result) {
        var url = result.url;
        var title = result.title || url;
        var favicon = result.favicon;

        //show either the small favicon (if there is one) or a generic page icon
        var objFallback = document.createElement('span');
        if(favicon) {
            objFallback.style.backgroundImage = 'url(' + favicon + ')';
        } else {
            objFallback.className = 'glyphicon glyphicon-file';
        }

        //create elements
        var item = document.createElement('li');
        var link = document.createElement('a');
        var obj = document.createElement('object');
        var text = document.createElement('span');
        link.setAttribute('href', url);
        text.textContent = title;

        //append the result
        var list = document.getElementById('history_list');
        list.appendChild(item).appendChild(link).appendChild(obj).appendChild(objFallback);
        link.appendChild(text);
    },

    /**
     * Updates the icon of the specified url.
     */
    updateIcon: function(data) {
        var url = data.url;
        var icon = data.icon;
        if(!url || !icon) {
            return;
        }
        var iconUrl = TabTrekkerHistory.getIconUrl(url, icon);
        if(!iconUrl) {
            return;
        }

        TabTrekkerHistory.isIconValid(iconUrl, function(error) {
            if (error) {
                return;
            }
            //find object inside link list item with specified url
            var object = $('#history_list > li > a[href="' + url + '"]').find('object:first-child');
            
            //set icon
            $(object).attr('data', iconUrl);
            
            //microsoft tile image styling
            if(TabTrekkerHistory.useMsTileImage(icon) && data.icon.hasOwnProperty('msTileColor') 
                && data.icon.msTileColor) {
                $(object).css('background-color', data.icon.msTileColor);
                $(object).addClass('ms_tile_color');
            }
        });

    },

    /**
     * Returns absolute url of the most preferred icon. 
     */
    getIconUrl: function(baseUrl, icon) {
        var iconUrl = icon.msTileImage || icon.appleIcon || icon.msTileLogo
            || icon.ogImage || icon.metaImage || icon.relIcon;
        if(iconUrl) {
            //resolve relative links (URL.js has a bug where it incorrectly
            //resolves URLs when both are absolute URLs)
            iconUrl = iconUrl.substring(0, 4) === 'http' ? iconUrl :
                URL.resolve(baseUrl, iconUrl);
        }
        return iconUrl;
    },

    /**
     * Returns whether the microsoft tile image should be used as the large icon.
     */
    useMsTileImage: function(icon) {
        return icon.msTileImage; //ms tile image is the top choice
    },

    /**
     * Checks whether the icon is valid for use in the history list.
     * An error returned in the callback means that the icon is not valid.
     */
    isIconValid: function(iconUrl, callback) {
        $(document.createElement('img')).on('load', function() {

            //check that the icon was actually loaded
            if(!this.complete || (this.naturalWidth === 0)) {
                callback(new Error('Icon failed to load.'));
            }
            //icon must be a certain width and height
            else if(this.width < ICON_MIN_WIDTH || this.height < ICON_MIN_HEIGHT) {
                callback(new Error('Icon is too small.'));
            } 
            //icon is valid
            else {
                callback();
            }

            $(this).remove();

        }).on('error', function() {
            callback(new Error('Icon failed to load.'));
            $(this).remove();
        }).attr('src', iconUrl).each(function() {
            //fail-safe for cached images which sometimes don't trigger load events
            if(this.complete) {
                $(this).load();
            }
        });
    }
};

//listen for messages
self.port.on(HISTORY_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerHistory.initHistory));
self.port.on(HISTORY_UPDATE_ICON_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerHistory.updateIcon));

