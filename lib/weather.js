'use strict';

/* SDK Modules */
const {Cu} = require('chrome');
Cu.import('resource://gre/modules/Promise.jsm');
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
const WEATHER_CONDITIONS_ICON_SS = 'weather_conditions_icon';
const WEATHER_LASTUPDATED_SS = 'weather_lastupdated';
const WEATHER_LOCATION_NAME_SS = 'weather_location_name';
const WEATHER_TEMPERATURE_SS = 'weather_temperature';
const WEATHER_TEMPERATURE_UNITS_SS = 'weather_temperature_units';
//others
const GEONAMES_URL = 'http://api.geonames.org/neighbourhoodJSON?lat=';
const GEONAMES_USERNAME = 'kyosho';
const OPENWEATHERMAP_APPID = '19c860e2c76bbe9e5f747af2250f751c';
const OPENWEATHERMAP_URL = 'http://api.openweathermap.org/data/2.5/weather?APPID=';
const OPENWEATHERMAP_REQUEST_URL = OPENWEATHERMAP_URL + OPENWEATHERMAP_APPID;
const WEATHER_UPDATE_INTERVAL_MILLIS = 10 * 60 * 1000; //10 minutes
const WEATHER_UPDATE_WAIT_MILLIS = 15 * 1000; //15 seconds

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
        if(weatherVisibility == 'never') {
            utils.emit(newtab.workers, worker, HIDE_WEATHER_MSG);
            return;
        }

        logger.log('Initializing weather.');

        var data = {
            conditionsIcon: ss.storage[WEATHER_CONDITIONS_ICON_SS],
            location: ss.storage[WEATHER_LOCATION_NAME_SS],
            temperature: ss.storage[WEATHER_TEMPERATURE_SS],
            temperatureUnits: ss.storage[WEATHER_TEMPERATURE_UNITS_SS],
            worker: worker
        };
        
        //immediately send cached weather result to content scripts
        if(data.conditionsIcon && data.location && data.temperature
            && data.temperatureUnits) {
            logger.log('Sending cached weather result.');
            NewTabWeather.displayWeather(data);
        }

        //request weather update if cached result is stale
        if(NewTabWeather.shouldUpdate()) {

            //set last updated time to in the future so no other updates will
            //happen during this update
            ss.storage[WEATHER_LASTUPDATED_SS] = Date.now() + WEATHER_UPDATE_WAIT_MILLIS;

            //indicate that the weather is being updated
            NewTabWeather.showLoadingSpinner(worker);

            //get user's location, update weather, and display weather
            NewTabWeather.getLocation(worker).
                then(NewTabWeather.getWeather).
                then(NewTabWeather.displayWeather).
                then(null, NewTabWeather.displayEmptyWeather);
        }
    },

    /**
     * Returns whether the weather should be updated.
     */
    shouldUpdate: function() {
        //no weather result exists
        var lastUpdated = ss.storage[WEATHER_LASTUPDATED_SS];
        if(!lastUpdated) {
            return true;
        }

        //check when the weather was last updated
        var now = Date.now();
        var elapsed = now - lastUpdated;

        return (elapsed >= WEATHER_UPDATE_INTERVAL_MILLIS);
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
     * Returns a promise that is fulfilled with either the current geolocation
     * or the user-defined location.
     */
    getLocation: function(worker) {
        return new Promise(function(resolve, reject) {
            //user-defined location
            var userLocation = simplePrefs.prefs[LOCATION_PREF];
            if(userLocation) {
                logger.log('Retrieved user-defined location.');
                resolve({
                    address: {
                        city: userLocation
                    },
                    worker: worker
                });
                return;
            }
            
            //request geolocation from content scripts
            utils.emit(newtab.workers, worker, WEATHER_GEOLOCATION_REQUEST_MSG);
            worker.port.on(WEATHER_GEOLOCATION_RESULT_MSG, function(coords) {

                //geolocation failed
                if(!coords || !coords.latitude || !coords.longitude) {
                    reject({
                        error: new Error('Geolocation failed.'),
                        worker: worker
                    });
                    return;
                }

                //copy coordinates
                var position = {
                    coords: coords,
                    worker: worker
                };

                logger.log('Requesting address from geocoder.');

                //request city name using reverse geocoding service from GeoNames
                const requestUrl = GEONAMES_URL
                    + coords.latitude + '&lng=' + coords.longitude 
                    + '&username=' + GEONAMES_USERNAME;
                Request({
                    url: requestUrl,
                    onComplete: function(response) {
                        if(response.status == 200) {
                            var neighbourhood = JSON.parse(response.text).neighbourhood;
                            //copy city and country
                            if(neighbourhood && neighbourhood.city 
                                && neighbourhood.countryCode) {
                                position.address = {
                                    city: neighbourhood.city,
                                    region: neighbourhood.countryCode
                                };
                            } else {
                                logger.warn('Geocoder request failed.');
                            }
                        } else {
                            logger.warn('Geocoder request failed.');
                        }
                        resolve(position);
                    }
                }).get();
            });
        });
    },

    /**
     * Returns a promise that is fulfilled with the requested weather results.
     */
    getWeather: function(position) {
        return new Promise(function(resolve, reject) {
            //build request URL
            var requestUrl =  OPENWEATHERMAP_REQUEST_URL;

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
                reject({
                    error: new Error('Cannot request weather update without a location.'),
                    worker: position.worker
                });
                return;
            }
            //temperature units
            var temperatureUnits = simplePrefs.prefs[TEMPERATURE_UNITS_PREF];
            requestUrl += '&units=' + (temperatureUnits == 'C' ? 'metric' : 'imperial');

            logger.log('Requesting weather.');

            //make weather request
            Request({
                url: requestUrl,
                onComplete: function(response) {
                    if(response.status != 200) {
                        reject({
                            error: new Error('Weather request failed.'),
                            worker: position.worker
                        });
                        return;
                    }
                    var json = JSON.parse(response.text);
                    var weather = {
                        conditionsIcon: NewTabWeather.getConditionsIcon(json.weather),
                        location: json.name,
                        temperature: json.main ? json.main.temp : null,
                        temperatureUnits: temperatureUnits,
                        worker: position.worker
                    };
                    //cache result and resolve promise
                    NewTabWeather.cacheWeatherResult(weather);
                    resolve(weather);
                }
            }).get();
        });
    },

    /**
     * Caches weather result in simple storage.
     */
    cacheWeatherResult: function(weather) {
        if(!weather.conditionsIcon || !weather.location || !weather.temperature
            || !weather.temperatureUnits) {
            logger.warn('Cannot cache invalid weather result.')
            return;
        }

        logger.log('Caching weather result.');

        ss.storage[WEATHER_CONDITIONS_ICON_SS] = weather.conditionsIcon;
        ss.storage[WEATHER_LASTUPDATED_SS] = Date.now();
        ss.storage[WEATHER_LOCATION_NAME_SS] = weather.location;
        ss.storage[WEATHER_TEMPERATURE_SS] = weather.temperature;
        ss.storage[WEATHER_TEMPERATURE_UNITS_SS] = weather.temperatureUnits;
    },

     /**
      * Displays weather by sending weather result to content scripts.
      */
    displayWeather: function(weather) {
        if(!weather.conditionsIcon || !weather.location || !weather.temperature
            || !weather.temperatureUnits) {
            NewTabWeather.displayEmptyWeather({
                error: new Error('Cannot send invalid weather result.'),
                worker: weather.worker
            });
            return;
        }

        logger.log('Sending weather result.');

        weather.temperatureUnits = NewTabWeather.getTemperatureUnitsStr(
            weather.temperatureUnits);
        weather[SHOW_WEATHER_PREF] = simplePrefs.prefs[SHOW_WEATHER_PREF];
        utils.emit(newtab.workers, weather.worker, WEATHER_MSG, weather);
    },

    /**
     * Displays an empty weather result by sending an empty result to content
     * scripts, indicating an invalid weather update request was made.
     */
    displayEmptyWeather: function(data) {

        logger.error('Sending empty weather result because "' + data.error.message + '"');

        var options = {
            conditionsIcon: NewTabWeather.getConditionsIcon(null),
            location: simplePrefs.prefs[LOCATION_PREF] || '',
            temperature: '--',
            temperatureUnits: null
        };
        options[SHOW_WEATHER_PREF] = simplePrefs.prefs[SHOW_WEATHER_PREF];
        utils.emit(newtab.workers, data.worker, WEATHER_MSG, options);
    },

    /**
     * Returns temperature units string that can be displayed on the page.
     */
    getTemperatureUnitsStr: function(temperatureUnitsPref) {
        return temperatureUnitsPref == 'C' ? _('temperature_units_options.°C') : 
            _('temperature_units_options.°F');
    },

    /**
     * Returns the character in the icon font that represents the weather
     * conditions.
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
    }
};

//listen to preference changes
simplePrefs.on(LOCATION_PREF, NewTabWeather.clearCachedWeatherResult);
simplePrefs.on(TEMPERATURE_UNITS_PREF, NewTabWeather.clearCachedWeatherResult);

exports.NewTabWeather = NewTabWeather;
