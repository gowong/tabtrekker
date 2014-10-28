'use strict';

/* Constants */
//messages
const HIDE_WEATHER_MSG = 'hide_weather';
const WEATHER_MSG = 'weather';
const WEATHER_GEOLOCATION_REQUEST_MSG = 'weather_geolocation_request';
const WEATHER_GEOLOCATION_RESULT_MSG = 'weather_geolocation_result';
const WEATHER_SHOW_LOADING_MSG = 'weather_show_loading';
//preferences
const SHOW_WEATHER_PREF = 'show_weather';

/**
 * Weather module.
 */
var Weather = {

    /**
     * Displays weather information on the page.
     */
    displayWeather: function(data) {
        if(!data) {
            return;
        }
        //location
        $('#weather_location').html(data.location.toUpperCase());
        //conditions
        var icon = Weather.getConditionsIcon(data.conditions);
        $('#weather_temperature').attr('data-icon', icon);
        //temperature
        var temperature = parseInt(data.temperature) || data.temperature;
        $('#weather_temperature').html(temperature);
        //temperature units
        $('#weather_temperature_units').html(data.temperatureUnits);
        //hide loading spinner when weather has been updated
        Weather.hideLoadingSpinner();
        Weather.setWeatherVisbility(data[SHOW_WEATHER_PREF]);
    },

    /**
     * Retrieves user's geolocation and sends position to the addon.
     */
    getGeolocation: function() {
        if('geolocation' in navigator) {

            var options = {
              enableHighAccuracy: true,
              timeout: 10000
            };

            navigator.geolocation.getCurrentPosition(function(position) {
                //only sending coordinates because for some unknown reason,
                //sending the entire position object causes it to fail serialization
                self.port.emit(WEATHER_GEOLOCATION_RESULT_MSG, {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            }, function(err) {
                logger.warn('ERROR(' + err.code + '): ' + err.message);
                self.port.emit(WEATHER_GEOLOCATION_RESULT_MSG, null);
            }, options);
        } else {
            logger.warn('Geolocation not supported.');
        }
    },

    /**
     * Returns the character of the icon that represents the weather conditions.
     */
    getConditionsIcon: function(conditions) {
        if(!conditions || !conditions.length) {
            //N/A
            return ')';
        }
        //iterate through weather conditions until the first icon is found
        var icon;
        for(var i = 0; i < conditions.length; i++) {
            if(conditions[i] && conditions[i].icon) {
                icon = conditions[i].icon;
                break;
            }
        }
        //could not find an icon
        if(!icon) {
            //N/A
            return ')';
        }
        //map icon name to character in icon font
        switch(icon) {
            // Day
            //Clear sky
            case '01d':
                return 'B';
            //Few clouds
            case '02d':
                return 'H';
            //Scattered clouds
            case '03d':
                return 'N';
            //Broken clouds
            case '04d':
                return 'Y';
            //Shower rain
            case '09d':
                return 'Q';
            //Rain
            case '10d':
                return 'R';
            //Thunderstorm
            case '11d':
                return '0';
            //Snow
            case '13d':
                return 'W';
            //Mist
            case '50d':
                return 'M';

            //Night
            //Clear sky
            case '01n':
                return 'C';
            //Few clouds
            case '02n':
                return 'I';
            //Scattered clouds
            case '03n':
                return 'N';
            //Broken clouds
            case '04n':
                return 'Y';
            //Shower rain
            case '09n':
                return 'Q';
            //Rain
            case '10n':
                return 'R';
            //Thunderstorm
            case '11n':
                return '0';
            //Snow
            case '13n':
                return 'W';
            //Mist
            case '50n':
                return 'M';
        }
    },

    /**
     * Shows loading spinner indicating that the weather is being updated.
     */
     showLoadingSpinner: function() {
        $('#weather_spinner').css('visibility', 'visible');
        $('#weather_double_bounce1').css('animation-play-state', 'running');
        $('#weather_double_bounce2').css('animation-play-state', 'running');
     },

    /**
     * Hides loading spinner.
     */
    hideLoadingSpinner: function() {
        $('#weather_spinner').css('visibility', 'hidden');
        $('#weather_double_bounce1').css('animation-play-state', 'paused');
        $('#weather_double_bounce2').css('animation-play-state', 'paused');
    },

    /**
     * Sets visibility of the weather based on user preferences.
     */
    setWeatherVisbility: function(visbilityPref) {
        switch(visbilityPref) {
            case 'always':
                $('#weather_container').css('display', 'block');
                $('#weather_container').css('opacity', 1);
                break;
            case 'hover':
                $('#weather_container').css('display', 'block');
                break;
            case 'never':
                Weather.hideWeather();
                break;
        }
    },

    /**
     * Hides the weather.
     */
    hideWeather: function() {
        $('#weather_container').css('display', 'none');
        Weather.hideLoadingSpinner();
    }
};

//listen for messages
self.port.on(HIDE_WEATHER_MSG, Utils.receiveMessage(Weather.hideWeather));
self.port.on(WEATHER_MSG, Utils.receiveMessage(Weather.displayWeather));
self.port.on(WEATHER_GEOLOCATION_REQUEST_MSG, Utils.receiveMessage(Weather.getGeolocation));
self.port.on(WEATHER_SHOW_LOADING_MSG, Utils.receiveMessage(Weather.showLoadingSpinner));
