'use strict';

/* SDK Modules */
const {Cu} = require('chrome');
Cu.import('resource://gre/modules/Promise.jsm');
Cu.import('resource://gre/modules/Task.jsm');
const Request = require('sdk/request').Request;
const simplePrefs = require('sdk/simple-prefs');
const ss = require('sdk/simple-storage');

/* Modules */
const logger = require('logger.js').TabTrekkerLogger;
const utils = require('utils.js').TabTrekkerUtils;
var tabtrekker; //load on initialization to ensure main module is loaded

/* Constants */
//messages
const LOCATION_GEOLOCATION_REQUEST_MSG = 'location_geolocation_request';
const LOCATION_GEOLOCATION_RESULT_MSG = 'location_geolocation_result';
//preferences
const LOCATION_PREF = 'location';
//simple storage
const LOCATION_GEOLOCATION_LAT_SS = 'location_geolocation_latitude';
const LOCATION_GEOLOCATION_LNG_SS = 'location_geolocation_longitude';
const LOCATION_GEOCODED_NAME_SS = 'location_geocoded_name';
//others
//geolocation coordinates at the same location usually differ by about 0.00001
const LOCATION_MIN_LAT_DIFF = 0.001;
const LOCATION_MIN_LNG_DIFF = 0.001;
const GEONAMES_URL = 'http://api.geonames.org/neighbourhoodJSON?lat=';
const GEONAMES_USERNAME = 'kyosho';

/**
 * Location module.
 */
var TabTrekkerLocation = {

    /**
     * Returns a promise that is fulfilled with either the current geolocation
     * or the user-defined location.
     */
    getLocation: function(workers, worker) {
        return Task.spawn(function*() {

            //user-defined location
            var userLocation = simplePrefs.prefs[LOCATION_PREF];
            if(userLocation) {
                logger.log('Retrieved user-defined location.');
                return {
                    address: {
                        city: userLocation
                    },
                    worker: worker
                };
            }

            //get geolocation
            return yield TabTrekkerLocation.getGeoLocation(workers, worker);

        }).then(null, function(error) {
            logger.error('Error getting location.', error.message);
            throw error;
        });
    },

    /**
     * Returns a promise that is fulfilled with the geolocation.
     */
    getGeoLocation: function(workers, worker) {
        return new Promise(function(resolve, reject) {
            //request geolocation from content scripts
            utils.emit(workers, worker, LOCATION_GEOLOCATION_REQUEST_MSG);
            //geolocation received
            worker.port.on(LOCATION_GEOLOCATION_RESULT_MSG, function(coords) {
                //geolocation failed
                if(!coords || coords.latitude == null
                    || coords.longitude == null) {
                    reject(new Error('Geolocation failed.'));
                    return;
                }

                //copy coordinates
                var position = {
                    coords: coords,
                    worker: worker
                };

                //make geocoding request
                return TabTrekkerLocation.geocodeCoordinates(position).
                    then(function(position) {
                        resolve(position);
                    }, function(error) {
                        reject(error);
                    });
            });
        });
    },

    /**
     * Returns whether the geolocation has changed enough to warrant making
     * a geocoding request.
     */
    shouldGeocode: function(coords) {
        var lat = coords.latitude;
        var lng = coords.longitude;
        var cachedLat = ss.storage[LOCATION_GEOLOCATION_LAT_SS];
        var cachedLng = ss.storage[LOCATION_GEOLOCATION_LNG_SS];
        var name = ss.storage[LOCATION_GEOCODED_NAME_SS];


        //no cached geolocation or location name
        //or large difference between current and cached geolocations
        var shouldGeocode = cachedLat == null
                         || cachedLng == null 
                         || !name
                         || Math.abs(cachedLat - lat) >= LOCATION_MIN_LAT_DIFF
                         || Math.abs(cachedLng - lng) >= LOCATION_MIN_LNG_DIFF;

        //cache current geolocation if it's different than the cached geolocation
        if(shouldGeocode) {
            ss.storage[LOCATION_GEOLOCATION_LAT_SS] = lat;
            ss.storage[LOCATION_GEOLOCATION_LNG_SS] = lng;
        }

        return shouldGeocode;
    },

    /**
     * Returns a promise that is fulfilled with the response to the
     * geocoding request of the coordinates.
     */
    geocodeCoordinates: function(position) {
        return new Promise(function(resolve, reject) {
            if(!position || !position.coords || position.coords.latitude == null
                || position.coords.longitude == null) {
                reject(new Error('Cannot make geocode request without coordinates.'));
                return;
            }
            var coords = position.coords;

            //only make geocoding request if geolocation has changed
            if(!TabTrekkerLocation.shouldGeocode(coords)) {
                resolve(TabTrekkerLocation.getCachedGeocodedPosition(position));
                return;
            }
            
            logger.info('Making geocoding request with coordinates:', coords);

            const requestUrl = GEONAMES_URL
                + coords.latitude + '&lng=' + coords.longitude 
                + '&username=' + GEONAMES_USERNAME;

            Request({
                url: requestUrl,
                onComplete: function(response) {
                    if(response.status == 200) {
                        position = TabTrekkerLocation.getGeocodedCity(
                            response, position);
                        TabTrekkerLocation.cacheGeocodedName(position);
                    } else {
                        logger.warn('Geocoder request failed. Returning original position object.');
                    }
                    resolve(position);
                }
            }).get();
        });
    },

    /**
     * Returns the position after adding the city and country.
     */
    getGeocodedCity: function(response, position) {
        var neighbourhood = response.json.neighbourhood;
        //copy city and country
        if(neighbourhood && neighbourhood.city 
            && neighbourhood.countryCode) {
            position.address = {
                city: neighbourhood.city,
                region: neighbourhood.countryCode
            };
        } else {
            logger.warn('Geocoder request did not contain city and country.');
        }
        return position;
    },

    /**
     * Returns the position after adding the cached geocoded name.
     */
    getCachedGeocodedPosition: function(position) {
        var name = ss.storage[LOCATION_GEOCODED_NAME_SS];
        position.address = {
            city: name
        };
        return position;
    },

    /**
     * Caches geocoded location name.
     */
    cacheGeocodedName: function(position) {
        var name = position.address.city;
        ss.storage[LOCATION_GEOCODED_NAME_SS] = name;
    }
};

exports.TabTrekkerLocation = TabTrekkerLocation;
