'use strict';

/* SDK Modules */
const {Cu} = require('chrome');
Cu.import('resource://gre/modules/Promise.jsm');
const _ = require('sdk/l10n').get;
const Request = require('sdk/request').Request;
const simplePrefs = require('sdk/simple-prefs');

/* Modules */
const location = require('./location').TabTrekkerLocation;
const logger = require('./logger').TabTrekkerLogger;
const secrets = require('./secrets').TabTrekkerSecrets;
const utils = require('./utils').TabTrekkerUtils;
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
const WEATHER_CONDITIONS_PREFS = 'weather_conditions';
const WEATHER_LASTUPDATED_TIME_PREFS = 'weather_lastupdated';
const WEATHER_LOCATION_NAME_PREFS = 'weather_location_name';
const WEATHER_TEMPERATURE_PREFS = 'weather_temperature';
const WEATHER_TEMPERATURE_UNITS_PREFS = 'weather_temperature_units';
//others
const FORECAST_API_KEY = secrets.FORECAST_API_KEY;
const FORECAST_REQUEST_URL = 'https://api.forecast.io/forecast/' + FORECAST_API_KEY + '/';
const FORECAST_REQUEST_OPTIONS = '?exclude=minutely,hourly,daily,alerts,flags';
const WEATHER_UPDATE_INTERVAL_MILLIS = 3 * 60 * 60 * 1000; //3 hours
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
        tabtrekker = require('./main').TabTrekkerMain;

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
        var lastUpdated = parseFloat(
            simplePrefs.prefs[WEATHER_LASTUPDATED_TIME_PREFS]);
        if(!lastUpdated && lastUpdated !== 0) {
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
        var lastUpdated = String(Date.now() - WEATHER_UPDATE_INTERVAL_MILLIS
            + millis);
        simplePrefs.prefs[WEATHER_LASTUPDATED_TIME_PREFS] = lastUpdated; 
    },

    /**
     * Clears cached weather result.
     */
    clearCachedWeatherResult: function() {
        logger.log('Clearing cached weather result.');
        simplePrefs.prefs[WEATHER_LASTUPDATED_TIME_PREFS] = '';
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
        return location.getLocation(worker).
            then(null, function(error) {
                throw new TabTrekkerWeather.WeatherException(error, worker);
        });
    },

    /**
     * Returns a promise that is fulfilled with the requested weather results.
     */
    getWeather: function(position) {
        return new Promise(function(resolve, reject) {

            if(!position.worker) {
                logger.error('Weather result is missing page worker.');
            }

            //build request URL
            var requestUrl =  FORECAST_REQUEST_URL;

            //use coordinates
            if(position.coords && position.coords.latitude != null
                && position.coords.longitude != null) {
                requestUrl += String(position.coords.latitude) + ',' + String(position.coords.longitude);
            } 
            //no location provided
            else {
                reject(new TabTrekkerWeather.WeatherException(
                    new Error('Cannot request weather update without a location.'), 
                    position.worker));
                return;
            }

            //add request options
            requestUrl += FORECAST_REQUEST_OPTIONS;

            //temperature units
            var temperatureUnits = simplePrefs.prefs[TEMPERATURE_UNITS_PREF];
            requestUrl += '&units=' + (temperatureUnits == 'C' ? 'si' : 'us');
            
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

        simplePrefs.prefs[WEATHER_CONDITIONS_PREFS] = JSON.stringify(weather.conditions);
        simplePrefs.prefs[WEATHER_LASTUPDATED_TIME_PREFS] = String(Date.now());
        simplePrefs.prefs[WEATHER_LOCATION_NAME_PREFS] = String(weather.location);
        simplePrefs.prefs[WEATHER_TEMPERATURE_PREFS] = String(weather.temperature);
        simplePrefs.prefs[WEATHER_TEMPERATURE_UNITS_PREFS] = String(weather.temperatureUnits);
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
            conditions: TabTrekkerWeather.getConditions(response.currently),
            location: position.location || _('current_location'),
            temperature: response.currently ? response.currently.temperature : null,
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
        var conditions = simplePrefs.prefs[WEATHER_CONDITIONS_PREFS];
        conditions = conditions ? JSON.parse(conditions) : {};
        var weather = {
            conditions: conditions,
            location: simplePrefs.prefs[WEATHER_LOCATION_NAME_PREFS],
            temperature: parseFloat(simplePrefs.prefs[WEATHER_TEMPERATURE_PREFS]),
            temperatureUnits: simplePrefs.prefs[WEATHER_TEMPERATURE_UNITS_PREFS],
            worker: worker
        };
        weather[SHOW_WEATHER_PREF] = simplePrefs.prefs[SHOW_WEATHER_PREF];
        return weather;
    },

    /**
     * Returns the weather conditions, containing the conditions icon and
     * description.
     */
    getConditions: function(currently) {
        return {
            description: currently ? currently.summary : '',
            icon: currently ? TabTrekkerWeather.getConditionsIcon(currently.icon)
                : TabTrekkerWeather.getConditionsIcon('')
        };
    },

    /**
     * Returns the character in the icon font that represents the weather
     * conditions.
     */
    getConditionsIcon: function(iconCode) {
        //map icon name to character in icon font
        switch(iconCode) {
            case 'clear-day':
                return 'B';
            case 'clear-night':
                return 'C';
            case 'rain':
                return 'R';
            case 'snow':
                return 'W';
            case 'sleet':
                return 'U';
            case 'wind':
                return 'F';
            case 'fog':
                return 'M';
            case 'cloudy':
                return 'Y';
            case 'partly-cloudy-day':
                return 'H';
            case 'partly-cloudy-night':
                return 'I';
            //The following aren't currently returned by the Forecast API, but
            //are defined here in case they are added in the future.
            case 'hail':
                return 'X';
            case 'thunderstorm':
                return '0';
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
