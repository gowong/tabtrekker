/* Constants */
const DISPLAY_TIME_INTERVAL = 1000;

var force24hour;
var displayTimeInterval;

//listen for messages
self.port.on('time_24hour', resetTime);

/**
 * Displays time based on the current locale and user preferences. 
 */
function displayTime() {
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

/**
 * Immediately displays the current time and resets the interval for displaying the time.
 */
function resetTime(is24hour) {
    force24hour = is24hour;

    //set locale
    moment.locale(navigator.language);

    //display time and reset interval
    clearInterval(displayTimeInterval);
    displayTime();
    displayTimeInterval = setInterval(displayTime, DISPLAY_TIME_INTERVAL);
}
