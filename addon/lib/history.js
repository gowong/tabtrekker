'use strict';

/* SDK Modules */
const {Cc, Ci} = require('chrome');
const Request = require('sdk/request').Request;

/* Modules */
const logger = require('logger.js').NewTabLogger;
const utils = require('utils.js').NewTabUtils;
var newtab; //load on initialization to ensure main module is loaded

/* Constants */
//messages
const HISTORY_MSG = 'history';
const HISTORY_UPDATE_ICON_MSG = 'history_update_icon';
//others
const MAX_MOST_VISITED = 9;

/**
 * History module.
 */
var NewTabHistory = {

    /**
     * Initializes history by sending history results to the content scripts.
     */
    initHistory: function(worker) {
        newtab = require('main.js').NewTabMain;
        
        logger.log('Initializing history.');

        var mostVisited = NewTabHistory.getMostVisited(MAX_MOST_VISITED);
        utils.emit(newtab.workers, worker, HISTORY_MSG, mostVisited);
        NewTabHistory.setLargeIcons(worker, mostVisited);
    },

    /**
     * Returns most visited web pages.
     */
    getMostVisited: function(maxResults) {

        var mostVisited = [];

        //query history for most visited pages
        var historyService = Cc['@mozilla.org/browser/nav-history-service;1']
                                .getService(Ci.nsINavHistoryService);
        var query = historyService.getNewQuery();
        var options = historyService.getNewQueryOptions();
        options.sortingMode = options.SORT_BY_VISITCOUNT_DESCENDING;
        options.maxResults = maxResults;
        var result = historyService.executeQuery(query, options);

        //extract each result
        result.root.containerOpen = true;
        var count = result.root.childCount;
        for (var i = 0; i < count; i++) {
            var node = result.root.getChild(i);
            mostVisited.push({
                title: node.title,
                url: node.uri,
                iconUri: node.icon
            });
        }

        result.root.containerOpen = false;
        return mostVisited;
    },

    /**
     * Notifies content scripts to set large icons for each history link.
     * A request is made to each link and the response is parsed to extract
     * the large icon.
     */
    setLargeIcons: function(worker, mostVisited) {
        for(var i = 0; i < mostVisited.length; i++) {
            let url = mostVisited[i].url;
            //request page
            Request({
                url: url,
                onComplete: function(response) {
                    if(response.status != 200) {
                        logger.error('Request failed for ' + url);
                        return;
                    }
                    //parse response to find a large icon
                    var icon = NewTabHistory.getLargeIcon(response);
                    //notify content scripts to update icon
                    utils.emit(newtab.workers, worker, HISTORY_UPDATE_ICON_MSG, {
                        url: url,
                        icon: icon
                    }); 
                }
            }).get();
        }
    },
    
    /**
     * Parses page response and attempts to return a known large icon.
     */
    getLargeIcon: function (response) {
        //parse html page to get head
        var parser = Cc['@mozilla.org/xmlextras/domparser;1'].createInstance(Ci.nsIDOMParser);
        var html = parser.parseFromString(response.text, 'text/html');
        var head = html.head;

        var icon = {};

        //iterate through head elements
        for(var i = 0; i < head.childElementCount; i++) {
            var element = head.children[i];
            var attrs = element.attributes;

            //link tags
            if(element.nodeName == 'LINK') {
                var rel = attrs.getNamedItem('rel');
                if(rel.nodeValue) {
                    var href = attrs.getNamedItem('href') ? 
                        attrs.getNamedItem('href').nodeValue : null;
                    switch(rel.nodeValue) {
                        //apple touch icon (57x57 to 152x152)
                        case 'apple-touch-icon':
                            icon.appleIcon = href;
                            break;
                        //higher-res favicon
                        case 'icon':
                            icon.relIcon = href;
                            break;
                    }
                }
            }
            //meta tags
            else if(element.nodeName == 'META') {
                var content = attrs.getNamedItem('content') ? 
                    attrs.getNamedItem('content').nodeValue : null;

                var itemprop = attrs.getNamedItem('itemprop');
                if(itemprop) {
                    switch(itemprop.nodeValue) {
                        //higher-res favicon
                        case 'image':
                            icon.metaImage = content;
                            break;
                    }
                }
                var name = attrs.getNamedItem('name');
                if(name) {
                    switch(name.nodeValue) {
                        //microsoft tile logo
                        case 'msapplication-square70x70logo':
                        case 'msapplication-square150x150logo':
                        case 'msapplication-square310x310logo':
                            icon.msTileLogo = content;
                            break;
                        //microsoft tile image (70x70 to 310x310+)
                        case 'msapplication-TileImage':
                            icon.msTileImage = content;
                            break;
                        //microsoft tile image background color
                        case 'msapplication-TileColor':
                            icon.msTileColor = content;
                            break;
                    }
                }
                var property = attrs.getNamedItem('property');
                if(property) {
                    switch(property.nodeValue) {
                        //open graph protocol image
                        case 'og:image':
                            icon.ogImage = content;
                            break;
                    }
                }
            }
        }
        return icon;
    }
};

exports.NewTabHistory = NewTabHistory;
