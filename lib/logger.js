const LOGGING = true;

exports.log = function(msg) {
    if(LOGGING) {
        console.log(msg);
    }
}

exports.info = function(msg) {
    if(LOGGING) {
        console.info(msg);
    }
}

exports.warn = function(msg) {
    if(LOGGING) {
        console.warn(msg);
    }
}

exports.error = function(msg) {
    if(LOGGING) {
        console.error(msg);
    }
}
