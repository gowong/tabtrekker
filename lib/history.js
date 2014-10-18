/* SDK Modules */
const {Cc,Ci} = require("chrome");

/* Modules */
const logger = require('logger.js');

/* Constants */
//messages
const HISTORY_MSG = 'history';
//others
const MAX_MOST_VISITED = 9;

/**
 * Initializes history by sending history results to the content scripts.
 */
exports.initHistory = function(worker) {
    logger.log('Initializing history.');
    worker.port.emit(HISTORY_MSG, getMostVisited(MAX_MOST_VISITED));
}

/**
 * Returns most visited web pages.
 */
function getMostVisited(maxResults) {

    var results = [];

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
        results.push({
            title: node.title,
            url: node.uri,
            iconUri: node.icon
        });
    }

    result.root.containerOpen = false;
    return results;
}

