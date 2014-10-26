/* SDK Modules */
const {Cc,Ci} = require("chrome");
const Request = require('sdk/request').Request;

/* Modules */
const logger = require('logger.js');

/* Constants */
//messages
const HISTORY_MSG = 'history';
const HISTORY_UPDATE_ICON_MSG = 'history_update_icon';
//others
const MAX_MOST_VISITED = 9;

var parser = Cc['@mozilla.org/xmlextras/domparser;1'].createInstance(Ci.nsIDOMParser);

/**
 * Initializes history by sending history results to the content scripts.
 */
exports.initHistory = function(worker) {
    logger.log('Initializing history.');
    var mostVisited = getMostVisited(MAX_MOST_VISITED);
    worker.port.emit(HISTORY_MSG, mostVisited);
    setLargeIcons(worker, mostVisited);
}

/**
 * Returns most visited web pages.
 */
function getMostVisited(maxResults) {

    var mostVisited = [];

    //query history for most visited pages
    var historyService = Cc["@mozilla.org/browser/nav-history-service;1"]
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
}

/**
 * Notifies content scripts to set large icons for each history link.
 * A request is made to each link and the response is parsed to extract
 * the large icon.
 */
function setLargeIcons(worker, mostVisited) {
    for(var i = 0; i < mostVisited.length; i++) {
        let url = mostVisited[i].url;
        //request page
        Request({
            url: url,
            onComplete: function(response) {
                //parse response to find a large icon
                var icon = getLargeIcon(response);
                //notify content scripts to update icon
                worker.port.emit(HISTORY_UPDATE_ICON_MSG, {
                    url: url,
                    icon: icon
                });
            }
        }).get();
    }
}

/**
 * Parses page response and attempts to return a known large icon.
 */
function getLargeIcon(response) {
    //parse html page to get head
    var html = parser.parseFromString(response.text, 'text/html');
    var head = html.head;

    var icon = {};

    //iterate through head elements
    for(var i = 0; i < head.childElementCount; i++) {
        var element = head.children[i];
        var attrs = element.attributes;

        //link tags
        if(element.nodeName === 'LINK') {
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
        else if(element.nodeName === 'META') {
            var name = attrs.getNamedItem('itemprop') ||
                attrs.getNamedItem('property') ||
                attrs.getNamedItem('name');
            if(name) {
                var content = attrs.getNamedItem('content') ? 
                    attrs.getNamedItem('content').nodeValue : null;
                switch(name.nodeValue) {
                    //itemprop: higher-res favicon
                    case 'image':
                        icon.metaImage = content;
                        break;
                    //property: open graph protocol image
                    case 'og:image':
                        icon.ogImage = content;
                        break;
                    //name: microsoft tile image (70x70 to 310x310+)
                    case 'msapplication-TileImage':
                        icon.msTile = content;
                        break;
                }
            }
        }
    }
    return icon;
}
