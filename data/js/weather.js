/* Constants */
const WEATHER_GEOLOCATION_REQUEST_MSG = 'weather_geolocation_request';
const WEATHER_GEOLOCATION_RESULT_MSG = 'weather_geolocation_result';

//listen for messages
self.port.on(WEATHER_GEOLOCATION_REQUEST_MSG, getGeolocation);

/**
 * Retrieves user's geolocation and sends position to the addon.
 */
 function getGeolocation() {
    if('geolocation' in navigator) {

        var options = {
          enableHighAccuracy: true,
          timeout: 5000
        };

        navigator.geolocation.getCurrentPosition(function(position) {
            //only sending coordinates because for some unknown reason,
            //sending the entire position object causes it to fail serialization
            self.port.emit(WEATHER_GEOLOCATION_RESULT_MSG, {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            });
        }, function(err) {
            console.warn('ERROR(' + err.code + '): ' + err.message);
        }, options);
    } else {
        console.warn('Geolocation not supported.');
    }
 }
