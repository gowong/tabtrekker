'use strict';

/* SDK Modules */
const {Cc, Ci, Cu} = require('chrome');
Cu.import('resource://gre/modules/Promise.jsm');
Cu.import('resource://gre/modules/Task.jsm');
Cu.import('resource://gre/modules/NewTabUtils.jsm');
const Request = require('sdk/request').Request;
const {getFavicon} = require("sdk/places/favicon");

/* Modules */
const logger = require('logger').TabTrekkerLogger;
const utils = require('utils').TabTrekkerUtils;
var tabtrekker; //load on initialization to ensure main module is loaded

/* Constants */
//messages
const HISTORY_MSG = 'history';
const HISTORY_UPDATE_ICON_MSG = 'history_update_icon';
//others
const MAX_MOST_VISITED = 9;

/**
 * History module.
 */
var TabTrekkerHistory = {

    /**
     * Initializes history by sending history results to the content scripts.
     */
    initHistory: function(worker) {
        tabtrekker = require('main').TabTrekkerMain;
        logger.log('Initializing history.');
        return Task.spawn(function*() {
            let mostVisited = yield TabTrekkerHistory.getMostVisited(MAX_MOST_VISITED);
            utils.emit(tabtrekker.workers, worker, HISTORY_MSG, mostVisited);
            TabTrekkerHistory.setLargeIcons(worker, mostVisited);
        });
    },

    /**
     * Returns a promise that is resolved by the most visited web pages.
     */
    getMostVisited: function(maxResults) {
        return Task.spawn(function*() {
            NewTabUtils.init();
            let links = NewTabUtils.links.getLinks();
            let mostVisited = [];

            //get history links only
            for(let i = 0; i < links.length; i++) {
                if(links[i].type === 'history') {
                    mostVisited.push(links[i]);
                }
                if(mostVisited.length === maxResults) {
                    break;
                }
            }

            //get favicons
            let faviconPromises = [];
            for(let i = 0; i < mostVisited.length; i++) {
                let item = mostVisited[i];
                let faviconPromise = new Promise(function(resolve, reject) {
                    getFavicon(item.url, function(faviconUrl) {
                        item.favicon = faviconUrl;
                        resolve();
                    });
                });
                faviconPromises.push(faviconPromise);
            }
            //wait for all favicons to be obtained
            yield Promise.all(faviconPromises);

            return mostVisited;

        }).then(null, function(error) {
            logger.error('Error getting most visited pages.', error);
            throw error;
        });
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
                    if(!response.text) {
                        logger.error('Request failed for ' + url, response);
                        return;
                    }
                    //parse response to find a large icon
                    var icon = TabTrekkerHistory.getLargeIcon(response);
                    //notify content scripts to update icon
                    utils.emit(tabtrekker.workers, worker, HISTORY_UPDATE_ICON_MSG, {
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
                if(rel.value) {
                    var href = attrs.getNamedItem('href') ? 
                        attrs.getNamedItem('href').value : null;
                    switch(rel.value) {
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
                    attrs.getNamedItem('content').value : null;

                var itemprop = attrs.getNamedItem('itemprop');
                if(itemprop) {
                    switch(itemprop.value) {
                        //higher-res favicon
                        case 'image':
                            icon.metaImage = content;
                            break;
                    }
                }
                var name = attrs.getNamedItem('name');
                if(name) {
                    switch(name.value) {
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
                    switch(property.value) {
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

exports.TabTrekkerHistory = TabTrekkerHistory;
