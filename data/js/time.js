/* Constants */
const _24HOUR_PREF = '24hour';
const DISPLAY_TIME_INTERVAL = 1000;

var displayTimeInterval;

//listen for messages
self.port.on('time', setTime);

/**
 * Immediately displays the current time and sets the interval for displaying the time.
 */
function setTime(prefs) {
    //set locale
    moment.locale(navigator.language);

    //display time and reset interval
    clearInterval(displayTimeInterval);
    displayTimeInterval = setInterval(function displayTimeFunc() {
        displayTime(prefs[_24HOUR_PREF]);
        return displayTimeFunc;
    }(), DISPLAY_TIME_INTERVAL);
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
