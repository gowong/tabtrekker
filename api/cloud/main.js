'use strict';

/* Modules */
var imageSets = require('cloud/imagesets.js').ImageSets;

/**
 * Responds with the next image set.
 * @param request.params.id The current image set id.
 * @param request.params.viewedIds array of viewed image set ids
 */
Parse.Cloud.define('getNextImageSet', function(request, response) {
    var id = parseInt(request.params.id, 10);
    id = (isNaN(id) || id < 0 || id >= imageSets.length) ? 0 : id;
    var nextId = 0;

    //get random image set if viewed image sets includes all image sets
    var viewedIds = request.params.viewedIds || [];
    if(viewedIds.length === imageSets.length) {
        nextId = Math.floor(Math.random() * imageSets.length);
    }
    //get next image set
    else {
        nextId = (id + 1) % imageSets.length;
    }

    //respond with image set
    var imageSet = imageSets[nextId];
    response.success(imageSet);
});
