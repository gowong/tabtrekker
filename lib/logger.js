const LOGGING = false;

var Logger = {

    log: function(msg, args) {
        if(LOGGING) {
            if(args) {
                console.log(msg, args);
            } else {
                console.log(msg);
            }
        }
    },

    info: function(msg, args) {
        if(LOGGING) {
            if(args) {
                console.info(msg, args);
            } else {
                console.info(msg);
            }
        }
    },

    warn: function(msg, args) {
        if(LOGGING) {
            if(args) {
                console.warn(msg, args);
            } else {
                console.warn(msg);
            }
        }
    },
    
    error: function(msg, args) {
        if(LOGGING) {
            if(args) {
                console.error(msg, args);
            } else {
                console.error(msg);
            }
        }
    }
}

exports.Logger = Logger;
