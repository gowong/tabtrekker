/* Constants */
const LOGGING = true;

/**
 * Logs the message to the console if debug mode is enabled.
 */
function log(msg) {
    if(LOGGING) {
        console.log(msg);
    }
}

exports.log = log;
