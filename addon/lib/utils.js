'use strict';

/* SDK Modules */
const {Cc, Ci} = require('chrome');

const array = require('sdk/util/array');

/* Modules */
const logger = require('./logger').TabTrekkerLogger;

/**
 * Utils module.
 */
var TabTrekkerUtils = {

    /**
     * Add worker to collection of workers if it doesn't already contain 
     * the worker.
     */
    addWorker: function(workers, worker) {
        logger.log('Adding worker', worker);
        array.add(workers, worker);
    },

    /**
     * Remove worker from collection of workers.
     */
    removeWorker: function(workers, worker) {
        logger.log('Removing worker', worker);
        array.remove(workers, worker);
    },

    /**
     * Returns whether the collection of workers contains the specified worker.
     */
    hasWorker: function(workers, worker) {
        var has = array.has(workers, worker);
        logger.log(has ? 'Workers has' : 'Workers does not have', worker);
        return has;
    },

    /**
     * Use worker to emit message and paylod only if the collection of workers
     * contains the worker.
     */
    emit: function(workers, worker, msg, payload) {
        if(TabTrekkerUtils.hasWorker(workers, worker)) {
            logger.log('Emit ' + msg, payload);
            worker.port.emit(msg, payload);
        }
    },

    /**
     * Returns the user's selected language (ex. Returns "en" for English).
     */
    getUserLanguage: function() {
        var locale = Cc['@mozilla.org/chrome/chrome-registry;1']
            .getService(Ci.nsIXULChromeRegistry)
            .getSelectedLocale('global');
        var end = locale.indexOf('-');
        end = (end === -1) ? locale.length : end;
        var language = locale.substring(0, end);
        return language;
    }
};

exports.TabTrekkerUtils = TabTrekkerUtils;
