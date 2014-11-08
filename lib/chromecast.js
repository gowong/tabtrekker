'use strict';

/* SDK Modules */
const {Cu} = require('chrome');
Cu.import('resource://gre/modules/Promise.jsm');
const Request = require('sdk/request').Request;
const ss = require('sdk/simple-storage');

/* Modules */
const logger = require('logger.js').NewTabLogger;

/* Constants */
//simple storage
const CHROMECAST_NEXT_ID_SS = 'chromecast_next_id';
//others
const CHROMECAST_AUTHOR_MAX_LENGTH = '40';
const CHROMECAST_IMAGES_SIZE = 's2560';
const CHROMECAST_IMAGES_URL = 'https://raw.githubusercontent.com/dconnolly/chromecast-backgrounds/master/backgrounds.json';

/**
 * Chromecast images module.
 */
var NewTabChromecast = {

    /**
     * Returns a promise that is fulfilled with the retrieved Chromecast images.
     */
    getImages: function(numImages) {
        logger.log('Requesting Chromecast images.');
        return new Promise(function(resolve, reject) {
            //request list of images
            Request({
                url: CHROMECAST_IMAGES_URL,
                onComplete: function(response) {
                    if(response.status != 200) {
                        reject(new Error('Chromecast images request failed.'));
                        return;
                    }
                    var images = JSON.parse(response.text);
                    //filter images
                    var filteredImages = NewTabChromecast.filterImages(images,
                        numImages);
                    if(filteredImages.length == 0) {
                        reject(new Error('Chromecast images request returned 0 images.'));
                        return;
                    }
                    resolve(filteredImages);
                }
            }).get();
        });
    },

    /**
     * Returns the filtered images.
     */
    filterImages: function(images, numImages) {
        var filteredImages = [];
        var start = ss.storage[CHROMECAST_NEXT_ID_SS] || 0;
        var i = (start < 0 || start >= images.length) ? 0 : start;
        numImages = Math.min(numImages, images.length);
        //get specified number of images
        while(filteredImages.length != numImages) {
            //add image
            filteredImages.push(NewTabChromecast.getImage(images[i]));
            i = (i + 1) % images.length;
        }
        //set the starting image id for the next images request
        ss.storage[CHROMECAST_NEXT_ID_SS] = i;
        return filteredImages;
    },

    /**
     * Returns an image object with the desired properties.
     */
    getImage: function(image) {
        //get largest size image
        var urlParts = image.url.split('/');
        urlParts[urlParts.length - 2] = CHROMECAST_IMAGES_SIZE;
        var url = urlParts.join('/');
        return {
            author: image.author.substring(0, CHROMECAST_AUTHOR_MAX_LENGTH),
            url: url
        }
    }
};

exports.NewTabChromecast = NewTabChromecast;
