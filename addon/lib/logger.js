'use strict';

/**
 * Logger module.
 */
var NewTabLogger = {

    logLevel: false,

    infoLevel: true,
    
    warnLevel: true,
    
    errorLevel: true,

    log: function(msg, args) {
        if(logLevel) {
            if(args) {
                console.log(msg, args);
            } else {
                console.log(msg);
            }
        }
    },

    info: function(msg, args) {
        if(infoLevel) {
            if(args) {
                console.info(msg, args);
            } else {
                console.info(msg);
            }
        }
    },

    warn: function(msg, args) {
        if(warnLevel) {
            if(args) {
                console.warn(msg, args);
            } else {
                console.warn(msg);
            }
        }
    },
    
    error: function(msg, args) {
        if(errorLevel) {
            if(args) {
                console.error(msg, args);
            } else {
                console.error(msg);
            }
        }
    }
}

exports.NewTabLogger = NewTabLogger;
