/* SDK Modules */
const Request = require("sdk/request").Request;
const ss = require('sdk/simple-storage');

/* Constants */
//messages
const WEATHER_MSG = 'weather';
const WEATHER_GEOLOCATION_REQUEST_MSG = 'weather_geolocation_request';
const WEATHER_GEOLOCATION_RESULT_MSG = 'weather_geolocation_result';
//preferences
const LOCATION_PREF = 'location';
const TEMPERATURE_UNITS_PREF = 'temperature_units';
//simple storage
const WEATHER_CONDITIONS_SS = 'weather_conditions';
const WEATHER_LASTUPDATED_SS = 'weather_lastupdated';
const WEATHER_LOCATION_NAME_SS = 'weather_location_name';
const WEATHER_TEMPERATURE_SS = 'weather_temperature';
//others
const OPENWEATHERMAP_APPID = '19c860e2c76bbe9e5f747af2250f751c';
const WEATHER_UPDATE_INTERVAL_MINUTES = 10;

/**
 * Initializes weather by either retrieving a cached weather result or retrieving
 * the latest weather result and sending the result to the content scripts.
 */
exports.initWeather = function(worker) {

    //clear cached weather result if it is stale
    clearCachedWeatherResult();

    //send cached weather result to content scripts
    var conditions = ss.storage[WEATHER_CONDITIONS_SS];
    var locationName = ss.storage[WEATHER_LOCATION_NAME_SS];
    var temperature = ss.storage[WEATHER_TEMPERATURE_SS];
    if(conditions && locationName && temperature) {
        worker.port.emit(WEATHER_MSG, {
            conditions: conditions,
            locationName: locationName,
            temperature: temperature
        });
        return;
    }

    //get user's location
    var location = ss.storage[LOCATION_PREF];
    getLocation(worker, location, function(position){

        //get weather
        var temperatureUnits = ss.storage[TEMPERATURE_UNITS_PREF];
        getWeather(OPENWEATHERMAP_APPID, position, temperatureUnits, function(result) {
            
            //send result to content scripts
            worker.port.emit(WEATHER_MSG, result);
        });
    });
}

/**
 * Clears cached weather result if it is stale.
 */
function clearCachedWeatherResult() {
    var lastUpdated = ss.storage[WEATHER_LASTUPDATED_SS];
    if(!lastUpdated) {
        return;
    }

    var now = Date.now();
    var elapsed = now - lastUpdated;
    var elapsedMinutes = elapsed / 1000 / 60;

    //check last updated time
    if(elapsedMinutes >= WEATHER_UPDATE_INTERVAL_MINUTES) {
        ss.storage[WEATHER_CONDITIONS_SS] = null;
        ss.storage[WEATHER_LOCATION_NAME_SS] = null;
        ss.storage[WEATHER_TEMPERATURE_SS] = null;
    }
}

/**
 * Retrieves the current geolocation or the user-defined location.
 */
function getLocation(worker, location, cb) {
    //user-defined location
    if(location) {
        var position = {
            address: {
                city: location
            }
        };
        cb(position);
        return;
    }

    //request geolocation from content scripts
    worker.port.emit(WEATHER_GEOLOCATION_REQUEST_MSG);
    worker.port.on(WEATHER_GEOLOCATION_RESULT_MSG, function(coords) {
        var position = {
            coords: coords
        };
        cb(position);
    });
}

/**
 * Requests weather via an API call to the weather provider.
 */
function getWeather(appId, position, temperatureUnits, cb) {
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
    } else {
        console.error('Cannot request weather update without a location.');
        return;
    }
    //temperature units
    var units = temperatureUnits === 'C' ? 'metric' : 'imperial';
    requestUrl += '&units=' + units;

    //make weather request
    Request({
        url: requestUrl,
        onComplete: function(response) {
            cacheWeatherResult(JSON.parse(response.text));
            cb(response);
        }
    }).get();
}

/**
 * Caches weather result in simple storage.
 */
 function cacheWeatherResult(result) {
    ss.storage[WEATHER_CONDITIONS_SS] = result.weather;
    ss.storage[WEATHER_LASTUPDATED_SS] = Date.now();
    ss.storage[WEATHER_LOCATION_NAME_SS] = result.name;
    ss.storage[WEATHER_TEMPERATURE_SS] = result.main.temp;
 }
