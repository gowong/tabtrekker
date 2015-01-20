'use strict';

/* SDK Modules */
const {Cu} = require('chrome');
Cu.import('resource://gre/modules/Promise.jsm');
const _ = require('sdk/l10n').get;
const Request = require('sdk/request').Request;
const simplePrefs = require('sdk/simple-prefs');
const ss = require('sdk/simple-storage');

/* Modules */
const location = require('location.js').TabTrekkerLocation;
const logger = require('logger.js').TabTrekkerLogger;
const utils = require('utils.js').TabTrekkerUtils;
var tabtrekker; //load on initialization to ensure main module is loaded

/* Constants */
//messages
const HIDE_WEATHER_MSG = 'hide_weather';
const WEATHER_MSG = 'weather';
const WEATHER_SHOW_LOADING_MSG = 'weather_show_loading';
//preferences
const LOCATION_PREF = 'location';
const TEMPERATURE_UNITS_PREF = 'temperature_units';
const SHOW_WEATHER_PREF = 'show_weather';
//simple storage
const WEATHER_CONDITIONS_SS = 'weather_conditions';
const WEATHER_LASTUPDATED_TIME_SS = 'weather_lastupdated';
const WEATHER_LOCATION_NAME_SS = 'weather_location_name';
const WEATHER_TEMPERATURE_SS = 'weather_temperature';
const WEATHER_TEMPERATURE_UNITS_SS = 'weather_temperature_units';
//others
const OPENWEATHERMAP_APPID = '19c860e2c76bbe9e5f747af2250f751c';
const OPENWEATHERMAP_URL = 'http://api.openweathermap.org/data/2.5/weather?APPID=';
const OPENWEATHERMAP_REQUEST_URL = OPENWEATHERMAP_URL + OPENWEATHERMAP_APPID;
const WEATHER_UPDATE_INTERVAL_MILLIS = 30 * 60 * 1000; //30 minutes
const WEATHER_UPDATE_WAIT_MILLIS = 20 * 1000; //20 seconds

/**
 * Weather module.
 */
var TabTrekkerWeather = {

    /**
     * Creates a WeatherException object. 
     */
    WeatherException: function(error, worker) {
        this.error = error;
        this.worker = worker;
        this.toString = function() {
            return this.error.message;
        }
    },

    /**
     * Initializes weather by either retrieving a cached weather result or retrieving
     * the latest weather result and sending the result to the content scripts.
     */
    initWeather: function(worker) {
        tabtrekker = require('main.js').TabTrekkerMain;

        //don't initialize weather if it is hidden
        var weatherVisibility = simplePrefs.prefs[SHOW_WEATHER_PREF];
        if(weatherVisibility === 'never') {
            utils.emit(tabtrekker.workers, worker, HIDE_WEATHER_MSG);
            return;
        }

        logger.log('Initializing weather.');

        //immediately display cached weather result
        var weather = TabTrekkerWeather.getCachedWeatherResult(worker);
        if(TabTrekkerWeather.isValidWeatherResult(weather)) {
            logger.log('Displaying cached weather result.');
            TabTrekkerWeather.displayWeather(weather);
        }

        //request weather update if cached result is stale
        if(TabTrekkerWeather.shouldUpdate()) {

            //prevent other updates from happening during this update
            TabTrekkerWeather.disableUpdates(WEATHER_UPDATE_WAIT_MILLIS);

            //indicate that the weather is being updated
            TabTrekkerWeather.showLoadingSpinner(worker);

            //get user's location, update weather, and display weather
            TabTrekkerWeather.getLocation(worker).
                then(TabTrekkerWeather.getWeather).
                then(TabTrekkerWeather.displayWeather).
                then(null, TabTrekkerWeather.displayEmptyWeather);
        }
    },

    /**
     * Returns whether the weather should be updated.
     */
    shouldUpdate: function() {
        //no weather result exists
        var lastUpdated = ss.storage[WEATHER_LASTUPDATED_TIME_SS];
        if(lastUpdated == null) {
            return true;
        }

        //check when the weather was last updated
        var now = Date.now();
        var elapsed = now - lastUpdated;

        return (elapsed >= WEATHER_UPDATE_INTERVAL_MILLIS);
    },

    /**
     * Disables updates for the specified milliseconds.
     */
    disableUpdates: function(millis) {
       ss.storage[WEATHER_LASTUPDATED_TIME_SS] = Date.now() -
            WEATHER_UPDATE_INTERVAL_MILLIS + millis; 
    },

    /**
     * Clears cached weather result.
     */
    clearCachedWeatherResult: function() {
        logger.log('Clearing cached weather result.');
        ss.storage[WEATHER_LASTUPDATED_TIME_SS] = null;
    },

    /**
     * Request content scripts to show loading spinner indicating that the weather
     * is being updated.
     */
    showLoadingSpinner: function(worker) {
        utils.emit(tabtrekker.workers, worker, WEATHER_SHOW_LOADING_MSG);
    },

    /**
     * Returns a promise that is fulfilled with either the current geolocation
     * or the user-defined location.
     */
    getLocation: function(worker) {
        return location.getLocation(tabtrekker.workers, worker).
            then(null, function(error) {
                throw new TabTrekkerWeather.WeatherException(error, worker);
        });
    },

    /**
     * Returns a promise that is fulfilled with the requested weather results.
     */
    getWeather: function(position) {
        return new Promise(function(resolve, reject) {
            //build request URL
            var requestUrl =  OPENWEATHERMAP_REQUEST_URL;

            //use user-defined location
            if(position.userLocation) {
                requestUrl += '&q=' + position.userLocation;
            }
            //use coordinates
            else if(position.coords && position.coords.latitude != null
                && position.coords.longitude != null) {
                requestUrl += '&lat=' + position.coords.latitude + '&lon=' + position.coords.longitude;
            } 
            //no location provided
            else {
                reject(new TabTrekkerWeather.WeatherException(
                    new Error('Cannot request weather update without a location.'), 
                    position.worker));
                return;
            }
            //temperature units
            var temperatureUnits = simplePrefs.prefs[TEMPERATURE_UNITS_PREF];
            requestUrl += '&units=' + (temperatureUnits == 'C' ? 'metric' : 'imperial');
            //user's selected language
            var language = utils.getUserLanguage();
            if(language) {
                requestUrl += '&lang=' + language;
            }

            logger.info('Requesting weather.', requestUrl);

            //make weather request
            Request({
                url: requestUrl,
                onComplete: function(response) {
                    if(response.status != 200) {
                        reject(new TabTrekkerWeather.WeatherException(
                            new Error('Weather request failed.'), 
                            position.worker));
                        return;
                    }
                    var weather = TabTrekkerWeather.getWeatherResult(
                        response.json, temperatureUnits, position, position.worker);
                    //cache result and resolve promise
                    TabTrekkerWeather.cacheWeatherResult(weather);
                    resolve(weather);
                }
            }).get();
        });
    },

    /**
     * Caches weather result.
     */
    cacheWeatherResult: function(weather) {
        if(!TabTrekkerWeather.isValidWeatherResult(weather)) {
            logger.warn('Cannot cache invalid weather result.')
            return;
        }

        logger.log('Caching weather result.');

        ss.storage[WEATHER_CONDITIONS_SS] = weather.conditions;
        ss.storage[WEATHER_LASTUPDATED_TIME_SS] = Date.now();
        ss.storage[WEATHER_LOCATION_NAME_SS] = weather.location;
        ss.storage[WEATHER_TEMPERATURE_SS] = weather.temperature;
        ss.storage[WEATHER_TEMPERATURE_UNITS_SS] = weather.temperatureUnits;
    },

     /**
      * Displays weather by sending weather result to content scripts.
      */
    displayWeather: function(weather) {
        if(!TabTrekkerWeather.isValidWeatherResult(weather)) {
            TabTrekkerWeather.displayEmptyWeather(
                new TabTrekkerWeather.WeatherException(
                    new Error('Cannot display invalid weather result.'), 
                    weather.worker));
            return;
        }

        logger.log('Displaying weather result.');
        utils.emit(tabtrekker.workers, weather.worker, WEATHER_MSG, weather);
    },

    /**
     * Displays an empty weather result by sending an empty result to content
     * scripts, indicating an invalid weather update request was made.
     */
    displayEmptyWeather: function(exception) {
        logger.error('Displaying empty weather result because "' + exception + '"');
        var weather = TabTrekkerWeather.getEmptyWeatherResult();
        utils.emit(tabtrekker.workers, exception.worker, WEATHER_MSG, weather);
    },

    /**
     * Returns whether the weather result is valid.
     */
    isValidWeatherResult: function(weather) {
        //allow temperature values of 0 by only checking for null or undefined
        return weather.conditions
            && weather.conditions.description && weather.conditions.icon
            && weather.location
            && weather.temperature != null
            && weather.temperatureUnits;
    },

    /**
     * Returns the formatted weather result.
     */
    getWeatherResult: function(response, temperatureUnits, position, worker) {
        var weather = {
            conditions: TabTrekkerWeather.getConditions(response.weather),
            location: position.location || response.name,
            temperature: response.main ? response.main.temp : null,
            temperatureUnits: TabTrekkerWeather.getTemperatureUnitsStr(
                temperatureUnits),
            worker: worker
        };
        weather[SHOW_WEATHER_PREF] = simplePrefs.prefs[SHOW_WEATHER_PREF];
        return weather;
    },

    /**
     * Returns an empty weather result, indicating a valid weather result
     * could not be retrieved.
     */
    getEmptyWeatherResult: function() {
        var weather = {
            conditions: TabTrekkerWeather.getConditions(null),
            location: simplePrefs.prefs[LOCATION_PREF] || '',
            temperature: '--',
            temperatureUnits: null
        };
        weather[SHOW_WEATHER_PREF] = simplePrefs.prefs[SHOW_WEATHER_PREF];
        return weather;
    },

    /**
     * Returns the cached weather result.
     */
    getCachedWeatherResult: function(worker) {
        var weather = {
            conditions: ss.storage[WEATHER_CONDITIONS_SS],
            location: ss.storage[WEATHER_LOCATION_NAME_SS],
            temperature: ss.storage[WEATHER_TEMPERATURE_SS],
            temperatureUnits: ss.storage[WEATHER_TEMPERATURE_UNITS_SS],
            worker: worker
        };
        weather[SHOW_WEATHER_PREF] = simplePrefs.prefs[SHOW_WEATHER_PREF];
        return weather;
    },

    /**
     * Returns the weather conditions, containing the conditions icon and
     * description.
     */
    getConditions: function(conditions) {
        var iconCode;
        var description;
        if(conditions) {
            //find first valid weather condition
            for(var i = 0; i < conditions.length; i++) {
                if(conditions[i] && conditions[i].icon && conditions[i].description) {
                    iconCode = conditions[i].icon;
                    description = conditions[i].description;
                    break;
                }
            }
        }
        return {
            description: description || '',
            icon: TabTrekkerWeather.getConditionsIcon(iconCode)
        };
    },

    /**
     * Returns the character in the icon font that represents the weather
     * conditions.
     */
    getConditionsIcon: function(iconCode) {
        //map icon name to character in icon font
        switch(iconCode) {
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

            //N/A
            default:
                return ')';
        }
    },

    /**
     * Returns temperature units string that can be displayed on the page.
     */
    getTemperatureUnitsStr: function(temperatureUnitsPref) {
        return temperatureUnitsPref === 'C' ? _('temperature_units_options.°C') : 
            _('temperature_units_options.°F');
    }
};

//listen to preference changes
simplePrefs.on(LOCATION_PREF, TabTrekkerWeather.clearCachedWeatherResult);
simplePrefs.on(TEMPERATURE_UNITS_PREF, TabTrekkerWeather.clearCachedWeatherResult);

exports.TabTrekkerWeather = TabTrekkerWeather;
