'use strict';

/**
 * Utils module.
 */
var TabTrekkerUtils = {

    /**
     * Receive messages from addon.
     */
    receiveMessage: function(cb) {
        return function(payload) {
            if(!document.hidden) {
                cb(payload); 
            }
        };
    }
};
