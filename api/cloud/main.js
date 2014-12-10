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
    //get first image set if there is no current image set, otherwise 
    //get the next image set
    var nextId = (isNaN(id) || id < 0 || id >= imageSets.length) ? 0
        : (id + 1) % imageSets.length;

    //get random image set if viewed image sets includes all image sets
    var viewedIds = request.params.viewedIds || [];
    if(viewedIds.length === imageSets.length) {
        nextId = Math.floor(Math.random() * imageSets.length);
    }
    //get next unviewed image set
    else {
        var i = nextId;
        var counter = 0;
        while(counter !== imageSets.length) {
            if(viewedIds.indexOf(imageSets[i].id) === -1) {
                nextId = i;
                break;
            }
            i = (i + 1) % imageSets.length;
            counter++;
        }
    }

    //respond with image set
    var imageSet = imageSets[nextId];
    response.success(imageSet);
});
