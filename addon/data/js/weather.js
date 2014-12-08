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
//others
const WEATHER_RESULTS_URL = 'https://www.google.com/search?q=weather';

/**
 * Weather module.
 */
var TabTrekkerWeather = {

    /**
     * Displays weather information on the page.
     */
    displayWeather: function(data) {
        if(!data) {
            return;
        }
        //set weather results link
        TabTrekkerWeather.setWeatherResultsLink(data.location);
        //temperature (show as int)
        var temperature = parseInt(data.temperature, 10) || data.temperature;
        $('#weather_temperature').html(temperature);
        //temperature units
        $('#weather_temperature_units').html(data.temperatureUnits);
        //conditions description
        $('#weather_temperature').attr('title', data.conditions.description);
        //conditions icon
        $('#weather_temperature').attr('data-icon', data.conditions.icon);
        //location
        $('#weather_location').html(data.location.toUpperCase());
        //hide loading spinner when weather has been updated
        TabTrekkerWeather.hideLoadingSpinner();
        TabTrekkerWeather.setWeatherVisbility(data[SHOW_WEATHER_PREF]);
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
     * Sets weather results link.
     */
    setWeatherResultsLink: function(location) {
        var link = location ? WEATHER_RESULTS_URL + ' ' + location
            : WEATHER_RESULTS_URL;
        $('#weather_results').attr('href', link);
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
                TabTrekkerWeather.hideWeather();
                break;
        }
    },

    /**
     * Hides the weather.
     */
    hideWeather: function() {
        $('#weather_container').css('display', 'none');
        TabTrekkerWeather.hideLoadingSpinner();
    }
};

//listen for messages
self.port.on(HIDE_WEATHER_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerWeather.hideWeather));
self.port.on(WEATHER_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerWeather.displayWeather));
self.port.on(WEATHER_GEOLOCATION_REQUEST_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerWeather.getGeolocation));
self.port.on(WEATHER_SHOW_LOADING_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerWeather.showLoadingSpinner));
