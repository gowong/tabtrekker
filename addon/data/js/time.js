'use strict';

/* Constants */
//messages
const HIDE_TIME_MSG = 'hide_time';
const TIME_MSG = 'time';
//preferences
const SHOW_TIME_PREF = 'show_time';
const TIME_FORMAT_PREF = 'time_format';
//others
const DISPLAY_TIME_INTERVAL = 1000;

/**
 * Time module.
 */
var TabTrekkerTime = {

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
        TabTrekkerTime.setTimeVisibility(data[SHOW_TIME_PREF]);
        //reset interval and display time
        clearInterval(TabTrekkerTime.displayTimeInterval);
        TabTrekkerTime.displayTimeInterval = setInterval(
            TabTrekkerTime.displayTime(data[TIME_FORMAT_PREF]), DISPLAY_TIME_INTERVAL);
    },

    /**
     * Displays time based on the current locale and user preferences. 
     */
    displayTime: function(timeFormatPref) {
        var now = new moment();

        //get time format from user preference
        var timeFormat;
        switch(timeFormatPref) {
            case '12hour':
                timeFormat = 'h:mm';
                break;
            case '24hour':
                timeFormat = 'HH:mm';
                break;
            case 'default':
            default:
                timeFormat = 'LT';
                break;
        }
        // get formatted time
        var formattedTime = now.format(timeFormat);

        //user-specified 24-hour format
        if(timeFormatPref === '24hour') {
            $('#time').text(formattedTime);
            //hide AM/PM text
            $('#time_ampm').text('');
        } else {
            //english 12-hour format
            var ampmIndex = Math.max(formattedTime.indexOf('AM'), formattedTime.indexOf('PM'));
            if(ampmIndex !== -1) {
                $('#time').text(formattedTime.substring(0, ampmIndex));
                $('#time_ampm').text(formattedTime.substring(ampmIndex, formattedTime.length));
            }
            //other locales or formats
            else {
                $('#time').text(formattedTime);
            }
        }
        return function() { TabTrekkerTime.displayTime(timeFormatPref) };
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
                TabTrekkerTime.hideTime();
                break;
        }
    },

    /**
     * Hides the time.
     */
    hideTime: function() {
        $('#time_container').css('display', 'none');
        clearInterval(TabTrekkerTime.displayTimeInterval);
    }
};

//listen for messages
self.port.on(HIDE_TIME_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerTime.hideTime));
self.port.on(TIME_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerTime.initTime));
