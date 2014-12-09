'use strict';

/* Constants */
//messages
const LOCATION_GEOLOCATION_REQUEST_MSG = 'location_geolocation_request';
const LOCATION_GEOLOCATION_RESULT_MSG = 'location_geolocation_result';
//others
const LOCATION_GEOLOCATION_HIGH_ACCURACY = true;
const LOCATION_GEOLOCATION_TIMEOUT = 10 * 1000; //10 seconds

/**
 * Location module.
 */
var TabTrekkerLocation = {

    /**
     * Retrieves user's geolocation and sends position to the addon.
     */
    getGeolocation: function() {
        if('geolocation' in navigator) {

            var options = {
              enableHighAccuracy: LOCATION_GEOLOCATION_HIGH_ACCURACY,
              timeout: LOCATION_GEOLOCATION_TIMEOUT
            };

            navigator.geolocation.getCurrentPosition(function(position) {
                //only sending coordinates because for some unknown reason,
                //sending the entire position object causes it to fail serialization
                self.port.emit(LOCATION_GEOLOCATION_RESULT_MSG, {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            }, function(err) {
                logger.warn('ERROR(' + err.code + '): ' + err.message);
                self.port.emit(LOCATION_GEOLOCATION_RESULT_MSG, null);
            }, options);
        } else {
            logger.warn('Geolocation not supported.');
        }
    },

};

self.port.on(LOCATION_GEOLOCATION_REQUEST_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerLocation.getGeolocation));
