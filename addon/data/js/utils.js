'use strict';

/**
 * Utils module.
 */
var TabTrekkerUtils = {

    loaded: true,

    /**
     * Receive messages from addon.
     */
    receiveMessage: function(cb) {
        return function(payload) {
            // Only accept the message if the page is loaded (this fixes issues
            // where a message is received right before the page is unloaded)
            if (TabTrekkerUtils.loaded) {
                cb(payload);
            }
        };
    }
};

//called on document ready
$(function() {
    //listen to window events
    $(window).on('beforeunload', function() {
        TabTrekkerUtils.loaded = false;
    });
});
