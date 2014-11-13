'use strict';

/* Modules */
var imageSets = require('cloud/images.js').imageSets;

/**
 * Responds with the next image set.
 * @param request.params.id The current image set id.
 */
Parse.Cloud.define('getNextImageSet', function(request, response) {
    var id = parseInt(request.params.id, 10);
    var nextId = isNaN(id) ? 0 : (id + 1) % imageSets.length;
    var imageSet = imageSets[nextId];
    response.success(imageSet);
});
