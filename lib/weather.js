'use strict';

/* SDK Modules */
const _ = require('sdk/l10n').get;
const Request = require('sdk/request').Request;
const simplePrefs = require('sdk/simple-prefs');
const ss = require('sdk/simple-storage');

/* Modules */
const logger = require('logger.js').NewTabLogger;
const utils = require('utils.js').NewTabUtils;
var newtab; //load on initialization to ensure main module is loaded

/* Constants */
//messages
const HIDE_WEATHER_MSG = 'hide_weather';
const WEATHER_MSG = 'weather';
const WEATHER_GEOLOCATION_REQUEST_MSG = 'weather_geolocation_request';
const WEATHER_GEOLOCATION_RESULT_MSG = 'weather_geolocation_result';
const WEATHER_SHOW_LOADING_MSG = 'weather_show_loading';
//preferences
const LOCATION_PREF = 'location';
const TEMPERATURE_UNITS_PREF = 'temperature_units';
const SHOW_WEATHER_PREF = 'show_weather';
//simple storage
const WEATHER_CONDITIONS_SS = 'weather_conditions';
const WEATHER_LASTUPDATED_SS = 'weather_lastupdated';
const WEATHER_LOCATION_NAME_SS = 'weather_location_name';
const WEATHER_TEMPERATURE_SS = 'weather_temperature';
const WEATHER_TEMPERATURE_UNITS_SS = 'weather_temperature_units';
//others
const GEONAMES_USERNAME = 'kyosho';
const OPENWEATHERMAP_APPID = '19c860e2c76bbe9e5f747af2250f751c';
const WEATHER_UPDATE_INTERVAL_MINUTES = 10;

/**
 * Weather module.
 */
var NewTabWeather = {

    /**
     * Initializes weather by either retrieving a cached weather result or retrieving
     * the latest weather result and sending the result to the content scripts.
     */
    initWeather: function(worker) {
        newtab = require('main.js').NewTabMain;
        
        //don't initialize weather if it is hidden
        var weatherVisibility = simplePrefs.prefs[SHOW_WEATHER_PREF];
        if(weatherVisibility === 'never') {
            utils.emit(newtab.workers, worker, HIDE_WEATHER_MSG);
            return;
        }

        logger.log('Initializing weather.');

        var conditions = ss.storage[WEATHER_CONDITIONS_SS];
        var locationName = ss.storage[WEATHER_LOCATION_NAME_SS];
        var temperature = ss.storage[WEATHER_TEMPERATURE_SS];
        var cachedTemperatureUnits = ss.storage[WEATHER_TEMPERATURE_UNITS_SS];
        
        //immediately send cached weather result to content scripts
        if(conditions && locationName && temperature && cachedTemperatureUnits) {
            logger.log('Sending cached weather result.');
            NewTabWeather.sendWeatherResult(worker, conditions, locationName, temperature, 
                cachedTemperatureUnits);
        }

        //request weather update if cached result is stale
        if(NewTabWeather.isCachedWeatherResultStale()) {

            //indicate that the weather is being updated
            NewTabWeather.showLoadingSpinner(worker);

            //get user's location
            var location = simplePrefs.prefs[LOCATION_PREF];
            NewTabWeather.getLocation(worker, location, function(position){

                //get updated weather and send result to content scripts
                var temperatureUnitsPref = simplePrefs.prefs[TEMPERATURE_UNITS_PREF];
                NewTabWeather.getWeather(worker, OPENWEATHERMAP_APPID, position, 
                    temperatureUnitsPref, NewTabWeather.sendWeatherResult);
            });
        }
    },

    /**
     * Returns whether the cached weather result is stale.
     */
    isCachedWeatherResultStale: function() {
        //the result is missing
        var lastUpdated = ss.storage[WEATHER_LASTUPDATED_SS];
        if(!lastUpdated) {
            return true;
        }

        //a certain amount of time has passed since the last update
        var now = Date.now();
        var elapsed = now - lastUpdated;
        var elapsedMinutes = elapsed / 1000 / 60;

        return (elapsedMinutes >= WEATHER_UPDATE_INTERVAL_MINUTES);
    },

    /**
     * Clears cached weather result.
     */
    clearCachedWeatherResult: function() {
        logger.log('Clearing cached weather result.');
        ss.storage[WEATHER_LASTUPDATED_SS] = null;
    },

    /**
     * Request content scripts to show loading spinner indicating that the weather
     * is being updated.
     */
    showLoadingSpinner: function(worker) {
        utils.emit(newtab.workers, worker, WEATHER_SHOW_LOADING_MSG);
    },

    /**
     * Retrieves the current geolocation or the user-defined location.
     */
    getLocation: function(worker, location, cb) {
        //user-defined location
        if(location) {
            logger.log('Retrieved user-defined location.');
            var position = {
                address: {
                    city: location
                }
            };
            cb(position);
            return;
        }

        //request geolocation from content scripts
        utils.emit(newtab.workers, worker, WEATHER_GEOLOCATION_REQUEST_MSG);
        worker.port.on(WEATHER_GEOLOCATION_RESULT_MSG, function(coords) {

            //geolocation failed
            if(!coords || !coords.latitude || !coords.longitude) {
                logger.error('Geolocation failed.');
                NewTabWeather.sendEmptyWeatherResult(worker);
                return;
            }

            //copy coordinates
            var position = {
                coords: coords
            };

            logger.log('Requesting address from geocoder.');

            //request city name using reverse geocoding service from GeoNames
            const requestUrl = 'http://api.geonames.org/neighbourhoodJSON?lat='
                + coords.latitude + '&lng=' + coords.longitude 
                + '&username=' + GEONAMES_USERNAME;
            Request({
                url: requestUrl,
                onComplete: function(response) {
                    var json = JSON.parse(response.text);
                    //copy city and country
                    if(json.neighbourhood && json.neighbourhood.city 
                        && json.neighbourhood.countryCode) {
                        position.address = {
                            city: json.neighbourhood.city,
                            region: json.neighbourhood.countryCode
                        };
                    } else {
                        logger.warn('Geocoder failed to return a result.');
                    }
                    cb(position);
                }
            }).get();
        });
    },

    /**
     * Requests weather via an API call to the weather provider.
     */
    getWeather: function(worker, appId, position, temperatureUnits, cb) {
        //build request URL
        var requestUrl = 'http://api.openweathermap.org/data/2.5/weather?APPID=' + appId;

        //use city name and region
        if(position.address && position.address.city) {
            var region = position.address.region ? ',' + position.address.region : '';
            requestUrl += '&q=' + position.address.city + region;
        }
        //use coordinates
        else if(position.coords && position.coords.latitude && position.coords.longitude) {
            requestUrl += '&lat=' + position.coords.latitude + '&lon=' + position.coords.longitude;
        } 
        //no location provided
        else {
            logger.error('Cannot request weather update without a location.');
            NewTabWeather.sendEmptyWeatherResult(worker);
            return;
        }
        //temperature units
        var units = temperatureUnits === 'C' ? 'metric' : 'imperial';
        requestUrl += '&units=' + units;

        logger.log('Requesting weather update.');

        //make weather request
        Request({
            url: requestUrl,
            onComplete: function(response) {
                var json = JSON.parse(response.text);
                var temperature = json.main ? json.main.temp : null;
                NewTabWeather.cacheWeatherResult(json.weather, json.name, temperature, temperatureUnits);
                cb(worker, json.weather, json.name, temperature, temperatureUnits);
            }
        }).get();
    },

    /**
     * Caches weather result in simple storage.
     */
    cacheWeatherResult: function(conditions, locationName, temperature, temperatureUnits) {
        if(!conditions || !locationName || !temperature || !temperatureUnits) {
            logger.info('Refused caching of invalid weather result.')
            return;
        }

        logger.log('Caching weather result.');

        ss.storage[WEATHER_CONDITIONS_SS] = conditions;
        ss.storage[WEATHER_LASTUPDATED_SS] = Date.now();
        ss.storage[WEATHER_LOCATION_NAME_SS] = locationName;
        ss.storage[WEATHER_TEMPERATURE_SS] = temperature;
        ss.storage[WEATHER_TEMPERATURE_UNITS_SS] = temperatureUnits;
    },

     /**
      * Sends weather result to content scripts.
      */
    sendWeatherResult: function(worker, conditions, locationName, temperature, temperatureUnits) {
        if(!conditions || !locationName || !temperature || !temperatureUnits) {
            logger.info('Refused sending invalid weather result.')
            NewTabWeather.sendEmptyWeatherResult(worker);
            return;
        }

        logger.log('Sending weather result.');

        var options = {
            conditions: conditions,
            location: locationName,
            temperature: temperature,
            temperatureUnits: NewTabWeather.getTemperatureUnitsStr(temperatureUnits)
        };
        options[SHOW_WEATHER_PREF] = simplePrefs.prefs[SHOW_WEATHER_PREF];
        utils.emit(newtab.workers, worker, WEATHER_MSG, options);
    },

    /**
     * Sends empty weather result to content scripts, indicating an invalid 
     * weather update request was made.
     */
    sendEmptyWeatherResult: function(worker) {

        logger.log('Sending empty weather result.');

        var options = {
            conditions: null,
            location: simplePrefs.prefs[LOCATION_PREF] || '',
            temperature: '--',
            temperatureUnits: null
        };
        options[SHOW_WEATHER_PREF] = simplePrefs.prefs[SHOW_WEATHER_PREF];
        utils.emit(newtab.workers, worker, WEATHER_MSG, options);
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
simplePrefs.on(LOCATION_PREF, NewTabWeather.clearCachedWeatherResult);
simplePrefs.on(TEMPERATURE_UNITS_PREF, NewTabWeather.clearCachedWeatherResult);

exports.NewTabWeather = NewTabWeather;
