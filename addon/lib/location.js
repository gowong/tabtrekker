'use strict';

/* SDK Modules */
const {Cu} = require('chrome');
Cu.import('resource://gre/modules/Promise.jsm');
Cu.import('resource://gre/modules/Task.jsm');
const Request = require('sdk/request').Request;
const simplePrefs = require('sdk/simple-prefs');

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
//others
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
    }
};

exports.TabTrekkerLocation = TabTrekkerLocation;
