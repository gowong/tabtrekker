'use strict';

/* SDK Modules */
const {Cc, Ci, Cu} = require('chrome');
Cu.import('resource://gre/modules/Promise.jsm');
Cu.import('resource://gre/modules/Task.jsm');
const _ = require('sdk/l10n').get;
const Request = require('sdk/request').Request;
const simplePrefs = require('sdk/simple-prefs');
const windowUtils = require('sdk/window/utils');

/* Modules */
const logger = require('./logger').TabTrekkerLogger;
const utils = require('./utils').TabTrekkerUtils;
const secrets = require('./secrets').TabTrekkerSecrets;

/* Constants */
//preferences
const LOCATION_PREF = 'location';
const LOCATION_ALLOW_GEOLOCATION_PREF = 'location_allow_geolocation';
const LOCATION_GEOLOCATION_LAT_PREF = 'location_geolocation_latitude';
const LOCATION_GEOLOCATION_LNG_PREF = 'location_geolocation_longitude';
const LOCATION_GEOCODED_NAME_PREF = 'location_geocoded_name';
//others
//geolocation coordinates at the same location usually differ by about 0.00001
const LOCATION_MIN_LAT_DIFF = 0.001;
const LOCATION_MIN_LNG_DIFF = 0.001;
const GEOCODE_KEY = secrets.GEOCODE_KEY;
const GEOCODE_COORDINATES_URL = 'https://maps.googleapis.com/maps/api/geocode/json?key='
    + GEOCODE_KEY + '&result_type=locality' + '&latlng=';
const GEOCODE_LOCATION_URL = 'https://maps.googleapis.com/maps/api/geocode/json?key='
    + GEOCODE_KEY + '&address=';

/**
 * Location module.
 */
var TabTrekkerLocation = {

    /**
     * Returns a promise that is fulfilled with either the current geolocation
     * or the user-defined location.
     */
    getLocation: function(worker) {
        return Task.spawn(function*() {

            var location;

            //user-defined location
            var userLocation = simplePrefs.prefs[LOCATION_PREF];
            if(userLocation) {
                logger.log('Retrieved user-defined location.');
                location = yield TabTrekkerLocation.geocodeLocation(userLocation);
            }
            //get geolocation
            else {
                location = yield TabTrekkerLocation.getGeoLocation();
            }

            location.worker = worker;
            return location;

        }).then(null, function(error) {
            logger.error('Error getting location.', error.message);
            throw error;
        });
    },

    /**
     * Returns a promise that is fulfilled with the geolocation.
     */
    getGeoLocation: function() {
        return new Promise(function(resolve, reject) {

            //get geolocation permission
            TabTrekkerLocation.getGeolocationPermission()
                .then(function() {

                    //request geolocation
                    var xpcomGeolocation = Cc['@mozilla.org/geolocation;1']
                                            .getService(Ci.nsISupports);
                    xpcomGeolocation.getCurrentPosition(function(position) {
                        //geolocation failed
                        if(!position || !position.coords
                            || position.coords.latitude == null
                            || position.coords.longitude == null) {
                            reject(new Error('Geolocation failed.'));
                            return;
                        }
                        //make geocoding request
                        return TabTrekkerLocation.geocodeCoordinates(position).
                            then(function(geocodedPosition) {
                                resolve(geocodedPosition);
                            }, function(error) {
                                reject(error);
                            });
                    });
                }, function(error) {
                    reject(error);
                });
        });
    },

    /**
     * Returns a promise that is fulfilled if the user has allowed the
     * geolocation.
     */
    getGeolocationPermission: function() {
        return new Promise(function(resolve, reject) {

            let done = false;
            var allowGeolocation = simplePrefs.prefs[LOCATION_ALLOW_GEOLOCATION_PREF];

            //always allowed
            if(allowGeolocation) {
                finish(true);
                return;
            } 
            //never allowed
            else if(allowGeolocation != null) {
                finish(false);
                return;
            }

            function finish(allowed) {
                done = true;
                if (allowed) {
                    resolve(true);
                } else {
                    reject(new Error('User did not allow geolocation.'));
                }
            }

            //prompt user for geolocation permission
            var activeBrowserWindow = windowUtils.getMostRecentBrowserWindow();
            activeBrowserWindow.PopupNotifications.show(
                activeBrowserWindow.gBrowser.selectedBrowser,
                'geolocation',
                _('geolocation_prompt_message'),
                null,
                {
                    label: _('geolocation_prompt_share'),
                    accessKey: 'A',
                    callback: function() {
                        logger.info('Geolocation allowed.');
                        simplePrefs.prefs[LOCATION_ALLOW_GEOLOCATION_PREF] = true;
                        finish(true);
                    }
                },
                [{
                    label: _('geolocation_prompt_nevershare'),
                    accessKey: 'N',
                    callback: function() {
                        logger.info('Geolocation not allowed.');
                        simplePrefs.prefs[LOCATION_ALLOW_GEOLOCATION_PREF] = false;
                        finish(false);
                    }
                }],
                {
                    eventCallback: function(event) {
                        if (event === 'dismissed' && !done) {
                            reject(new Error('Geolocation permission prompt dismissed.'));
                        }
                    }
                });
        });
    },

    /**
     * Returns whether the geolocation has changed enough to warrant making
     * a geocoding request.
     */
    shouldGeocode: function(coords) {
        var cachedLat = parseFloat(simplePrefs.prefs[LOCATION_GEOLOCATION_LAT_PREF]);
        var cachedLng = parseFloat(simplePrefs.prefs[LOCATION_GEOLOCATION_LNG_PREF]);
        var name = simplePrefs.prefs[LOCATION_GEOCODED_NAME_PREF];

        //missing cached geolocation or location name
        if((!cachedLat && cachedLat !== 0)
            || (!cachedLng && cachedLng !== 0)
            || !name) {
            return true;
        }

        if(coords) {
            //large difference between current and cached geolocations
            return (Math.abs(cachedLat - coords.latitude) >= LOCATION_MIN_LAT_DIFF)
                || (Math.abs(cachedLng - coords.longitude) >= LOCATION_MIN_LNG_DIFF);
        }

        return false;
    },


    /**
     * Returns a promise that is fulfilled with the response to the
     * geocoding request of the location string.
     */
    geocodeLocation: function(location) {
        return new Promise(function(resolve, reject) {
            if(!location) {
                reject(new Error('Cannot make geocode request without location.'));
                return;
            }

            //only make geocoding request if needed
            if(!TabTrekkerLocation.shouldGeocode(null)) {
                resolve(TabTrekkerLocation.getCachedGeocodedPosition(null));
                return;
            }
        
            //clear cached geocoded position
            TabTrekkerLocation.clearCachedGeocodedPosition();

            //build request URL
            var requestUrl = GEOCODE_LOCATION_URL + location;
            var language = utils.getUserLanguage();
            if(language) {
                requestUrl += '&language=' + language;
            }

            logger.info('Making geocoding request with location:', requestUrl);

            Request({
                url: requestUrl,
                onComplete: function(response) {
                    if(response.status == 200) {
                        //parse response and cache result
                        var newPosition = TabTrekkerLocation.getGeocodedPosition(response);
                        if(newPosition) {
                            TabTrekkerLocation.cacheGeocodedPosition(newPosition);
                            resolve(newPosition);
                        }
                    } else {
                        logger.error('Geocoder request failed.');
                    }
                    reject(new Error('Geocoder request failed.'));
                }
            }).get();
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

            //only make geocoding request if geolocation has changed
            if(!TabTrekkerLocation.shouldGeocode(position.coords)) {
                resolve(TabTrekkerLocation.getCachedGeocodedPosition(position));
                return;
            }
            
            //clear cached geocoded position
            TabTrekkerLocation.clearCachedGeocodedPosition();

            //build request URL
            var requestUrl = GEOCODE_COORDINATES_URL
                + position.coords.latitude + ',' + position.coords.longitude;
            var language = utils.getUserLanguage();
            if(language) {
                requestUrl += '&language=' + language;
            }

            logger.info('Making geocoding request with coordinates:',
                requestUrl);

            Request({
                url: requestUrl,
                onComplete: function(response) {
                    if(response.status == 200) {
                        //parse response and cache result
                        var newPosition = TabTrekkerLocation.getGeocodedPosition(response);
                        if(newPosition) {
                            //only use the geocoded location name
                            //it is important to cache the original coordinates,
                            //NOT the geocoded coordinates (otherwise the cache
                            //won't work)
                            position.location = newPosition.location;
                            TabTrekkerLocation.cacheGeocodedPosition(position);
                        }
                    } else {
                        logger.warn('Geocoder request failed. Returning original position object.');
                    }
                    resolve(position);
                }
            }).get();
        });
    },

    /**
     * Returns the position containing coordinates and city.
     */
    getGeocodedPosition: function(response) {
        var json = response.json;
        if(json.status !== 'OK') {
            logger.warn('Gecoding request failed.', json);
            return null;
        }

        //find city
        var city;
        var addresses = json.results[0].address_components;
        for (var i = 0; i < addresses.length; i++) {
            var address = addresses[i];
            if(address.types.indexOf('locality') !== -1) {
                city = address.long_name;
                break;
            }
        }

        //find coordinates
        var location = json.results[0].geometry.location;
        var coords = {
            latitude: location ? location.lat : null,
            longitude: location ? location.lng : null
        };

        return {
            coords: coords,
            location: city
        };
    },

    /**
     * Returns the position after adding the cached geocoded name.
     */
    getCachedGeocodedPosition: function(position) {
        //assuming that the passed in position already has coordinates
        if(position) {
            position.location = simplePrefs.prefs[LOCATION_GEOCODED_NAME_PREF];
            return position;
        }
        return {
            location: simplePrefs.prefs[LOCATION_GEOCODED_NAME_PREF],
            coords: {
                latitude: simplePrefs.prefs[LOCATION_GEOLOCATION_LAT_PREF],
                longitude: simplePrefs.prefs[LOCATION_GEOLOCATION_LNG_PREF]
            }
        };
    },

    /**
     * Caches geocoded position.
     */
    cacheGeocodedPosition: function(position) {
        if(!position || !position.location || !position.coords
            || position.coords.latitude == null
            || position.coords.longitude == null) {
            logger.warn('Cannot cache invalid geocoded position.');
            return;
        }
        simplePrefs.prefs[LOCATION_GEOCODED_NAME_PREF] = String(position.location);
        simplePrefs.prefs[LOCATION_GEOLOCATION_LAT_PREF] = String(position.coords.latitude);
        simplePrefs.prefs[LOCATION_GEOLOCATION_LNG_PREF] = String(position.coords.longitude);
    },

    /**
     * Clears cached geocoded position.
     */
    clearCachedGeocodedPosition: function() {
        simplePrefs.prefs[LOCATION_GEOCODED_NAME_PREF] = '';
        simplePrefs.prefs[LOCATION_GEOLOCATION_LAT_PREF] = '';
        simplePrefs.prefs[LOCATION_GEOLOCATION_LNG_PREF] = '';
    }
};

//listen to preference changes
simplePrefs.on(LOCATION_PREF, TabTrekkerLocation.clearCachedGeocodedPosition);

exports.TabTrekkerLocation = TabTrekkerLocation;
