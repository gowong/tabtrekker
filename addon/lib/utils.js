'use strict';

/* SDK Modules */
const array = require('sdk/util/array');

/* Modules */
const logger = require('logger.js').NewTabLogger;

/**
 * Utils module.
 */
var NewTabUtils = {

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
        if(NewTabUtils.hasWorker(workers, worker)) {
            logger.log('Emit ' + msg, payload);
            worker.port.emit(msg, payload);
        }
    }
};

exports.NewTabUtils = NewTabUtils;
