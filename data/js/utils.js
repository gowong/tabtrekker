
/**
 * Utils module.
 */
var Utils = {

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
