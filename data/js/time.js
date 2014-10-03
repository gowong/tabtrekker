/* Constants */
//messages
const TIME_MSG = 'time';
//preferences
const _24HOUR_PREF = '24hour';
//others
const DISPLAY_TIME_INTERVAL = 1000;

var displayTimeInterval;

//listen for messages
self.port.on(TIME_MSG, setTimeInterval);

/**
 * Immediately displays the current time and sets the interval for updating
 * the time.
 */
function setTimeInterval(options) {
    //set locale
    moment.locale(navigator.language);
    //reset interval and display time
    clearInterval(displayTimeInterval);
    displayTimeInterval = setInterval(initTime(options), DISPLAY_TIME_INTERVAL);
}

/**
 * Initializes time with the proper configuration options.
 */
function initTime(options) {
    displayTime(options[_24HOUR_PREF]);
    return function() { initTime(options); };
}

/**
 * Displays time based on the current locale and user preferences. 
 */
function displayTime(force24hour) {
    var now = new moment();

    //user-specified 24-hour format
    if(force24hour) {
        $('#time').html(now.format('HH:mm'));
        $('#time_ampm').html('');
    } else {
        var formattedTime = now.format('LT');
        //english 12-hour format
        var ampmIndex = Math.max(formattedTime.indexOf('AM'), formattedTime.indexOf('PM'));
        if(ampmIndex > -1) {
            $('#time').html(formattedTime.substring(0, ampmIndex));
            $('#time_ampm').html(formattedTime.substring(ampmIndex, formattedTime.length));
        } 
        //other locales or formats
        else {
            $('#time').html(formattedTime);
        }
    }
}
