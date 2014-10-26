const LOGGING = false;

var Logger = {

    log: function(msg) {
        if(LOGGING) {
            console.log(msg);
        }
    },

    info: function(msg) {
        if(LOGGING) {
            console.info(msg);
        }
    },

    warn: function(msg) {
        if(LOGGING) {
            console.warn(msg);
        }
    },
    
    error: function(msg) {
        if(LOGGING) {
            console.error(msg);
        }
    }
}

exports.Logger = Logger;
