'use strict';

/* Modules */
var imageSets = require('./imagesets.js').ImageSets;

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
    //defaults to the first image in the image set
    var startingImageId = 0;

    var viewedIds = request.params.viewedIds || [];
    //user has seen all image sets
    if(viewedIds.length >= imageSets.length) {
        //get random image set
        do {
            nextId = Math.floor(Math.random() * imageSets.length);
        } while(nextId === id);

        //select a random starting image
        var numImages = imageSets[nextId].images.length;
        startingImageId = Math.floor(Math.random() * numImages);
    }
    //get next unviewed image set
    else {
        var counter = 0;
        while(counter !== imageSets.length) {
            if(viewedIds.indexOf(nextId) === -1) {
                break;
            }
            nextId = (nextId + 1) % imageSets.length;
            counter++;
        }
    }

    //respond with image set
    var imageSet = imageSets[nextId];
    imageSet.id = nextId;
    imageSet.startingImageId = startingImageId;
    response.success(imageSet);
});
