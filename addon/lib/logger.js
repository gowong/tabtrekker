'use strict';

/**
 * Logger module.
 */
var TabTrekkerLogger = {

    logLevel: false,

    infoLevel: false,
    
    warnLevel: false,
    
    errorLevel: false,

    log: function(msg, args) {
        if(TabTrekkerLogger.logLevel) {
            if(args) {
                console.log(msg, args);
            } else {
                console.log(msg);
            }
        }
    },

    info: function(msg, args) {
        if(TabTrekkerLogger.infoLevel) {
            if(args) {
                console.info(msg, args);
            } else {
                console.info(msg);
            }
        }
    },

    warn: function(msg, args) {
        if(TabTrekkerLogger.warnLevel) {
            if(args) {
                console.warn(msg, args);
            } else {
                console.warn(msg);
            }
        }
    },
    
    error: function(msg, args) {
        if(TabTrekkerLogger.errorLevel) {
            if(args) {
                console.error(msg, args);
            } else {
                console.error(msg);
            }
        }
    }
}

exports.TabTrekkerLogger = TabTrekkerLogger;
