'use strict';

/* Constants */
//messages
const HIDE_TIME_MSG = 'hide_time';
const TIME_MSG = 'time';
//preferences
const _24HOUR_PREF = '24hour';
const SHOW_TIME_PREF = 'show_time';
//others
const DISPLAY_TIME_INTERVAL = 1000;

/**
 * Time module.
 */
var NewTabTime = {

    displayTimeInterval: null,

    /**
     * Immediately displays the current time and sets the interval for updating
     * the time.
     */
    initTime: function(data) {
        if(!data) {
            return;
        }
        //set locale
        moment.locale(navigator.language);
        //set visibility
        NewTabTime.setTimeVisibility(data[SHOW_TIME_PREF]);
        //reset interval and display time
        clearInterval(NewTabTime.displayTimeInterval);
        NewTabTime.displayTimeInterval = setInterval(NewTabTime.displayTime(data[_24HOUR_PREF]),
            DISPLAY_TIME_INTERVAL);
    },

    /**
     * Displays time based on the current locale and user preferences. 
     */
    displayTime: function(force24hour) {
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
        return function() { NewTabTime.displayTime(force24hour) };
    },

    /**
     * Sets visibility of the time based on user preferences.
     */
    setTimeVisibility: function(visbilityPref) {
        switch(visbilityPref) {
            case 'always':
                $('#time_container').css('display', 'block');
                $('#time_container').css('opacity', 1);
                break;
            case 'hover':
                $('#time_container').css('display', 'block');
                break;
            case 'never':
                NewTabTime.hideTime();
                break;
        }
    },

    /**
     * Hides the time.
     */
    hideTime: function() {
        $('#time_container').css('display', 'none');
        clearInterval(NewTabTime.displayTimeInterval);
    }
};

//listen for messages
self.port.on(HIDE_TIME_MSG, NewTabUtils.receiveMessage(NewTabTime.hideTime));
self.port.on(TIME_MSG, NewTabUtils.receiveMessage(NewTabTime.initTime));