'use strict';

/**
 * Collection of images to be cycled through.
 * Image sizes: at least 1920px wide, less than 5 MB
 */
exports.ImageSets = [
    //0
    require('cloud/imagesets/atlantic_ocean_road.js').ImageSet,
    //1
    require('cloud/imagesets/bora_bora.js').ImageSet,
    //2
    require('cloud/imagesets/fiordland.js').ImageSet
];
