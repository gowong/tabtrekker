/* SDK Modules */
const _ = require('sdk/l10n').get;
const Request = require('sdk/request').Request;
const simplePrefs = require('sdk/simple-prefs');
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
const WEATHER_TEMPERATURE_UNITS_SS = 'weather_temperature_units';
//others
const GEONAMES_USERNAME = 'kyosho';
const OPENWEATHERMAP_APPID = '19c860e2c76bbe9e5f747af2250f751c';
const WEATHER_UPDATE_INTERVAL_MINUTES = 10;

//listen to preference changes
simplePrefs.on(LOCATION_PREF, clearCachedWeatherResult);
simplePrefs.on(TEMPERATURE_UNITS_PREF, clearCachedWeatherResult);

/**
 * Initializes weather by either retrieving a cached weather result or retrieving
 * the latest weather result and sending the result to the content scripts.
 */
exports.initWeather = function(worker) {

    var conditions = ss.storage[WEATHER_CONDITIONS_SS];
    var locationName = ss.storage[WEATHER_LOCATION_NAME_SS];
    var temperature = ss.storage[WEATHER_TEMPERATURE_SS];
    var cachedTemperatureUnits = ss.storage[WEATHER_TEMPERATURE_UNITS_SS];
    
    //immediately send cached weather result to content scripts
    if(conditions && locationName && temperature && cachedTemperatureUnits) {
        sendWeatherResult(worker, conditions, locationName, temperature, 
            cachedTemperatureUnits);
    }

    //request weather update if cached result is stale
    if(isCachedWeatherResultStale()) {

        //get user's location
        var location = simplePrefs.prefs[LOCATION_PREF];
        getLocation(worker, location, function(position){

            //get updated weather and send result to content scripts
            var temperatureUnitsPref = simplePrefs.prefs[TEMPERATURE_UNITS_PREF];
            getWeather(worker, OPENWEATHERMAP_APPID, position, 
                temperatureUnitsPref, sendWeatherResult);
        });
    }
}

/**
 * Returns whether the cached weather result is stale.
 */
function isCachedWeatherResultStale() {
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
}

/**
 * Clears cached weather result.
 */
function clearCachedWeatherResult() {
    ss.storage[WEATHER_LASTUPDATED_SS] = null;
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
        //copy coordinates
        var position = {
            coords: coords
        };

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
                }
                cb(position);
            }
        }).get();
    });
}

/**
 * Requests weather via an API call to the weather provider.
 */
function getWeather(worker, appId, position, temperatureUnits, cb) {
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
            var json = JSON.parse(response.text);
            cacheWeatherResult(json.weather, json.name, json.main.temp, temperatureUnits);
            cb(worker, json.weather, json.name, json.main.temp, temperatureUnits);
        }
    }).get();
}

/**
 * Caches weather result in simple storage.
 */
 function cacheWeatherResult(conditions, locationName, temperature, temperatureUnits) {
    ss.storage[WEATHER_CONDITIONS_SS] = conditions;
    ss.storage[WEATHER_LASTUPDATED_SS] = Date.now();
    ss.storage[WEATHER_LOCATION_NAME_SS] = locationName;
    ss.storage[WEATHER_TEMPERATURE_SS] = temperature;
    ss.storage[WEATHER_TEMPERATURE_UNITS_SS] = temperatureUnits;
 }

 /**
  * Sends weather result to content scripts
  */
function sendWeatherResult(worker, conditions, locationName, temperature, temperatureUnits) {
    worker.port.emit(WEATHER_MSG, {
        conditions: conditions,
        location: locationName,
        temperature: temperature,
        temperatureUnits: getTemperatureUnitsStr(temperatureUnits)
    });
}

/**
 * Returns temperature units string that can be displayed on the page.
 */
 function getTemperatureUnitsStr(temperatureUnitsPref) {
    return temperatureUnitsPref === 'C' ? _('temperature_units_options.°C') : 
        _('temperature_units_options.°F');
 }
