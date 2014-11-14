'use strict';

/* SDK Modules */
const ss = require('sdk/simple-storage');

/* Modules */
const logger = require('logger.js').NewTabLogger;
const parse = require('parse.js').NewTabParse;
const utils = require('utils.js').NewTabUtils;
var newtab; //load on initialization to ensure main module is loaded

/* Constants */
//messages
const IMAGES_DISPLAY_MSG = 'images_display';
//simple storage
const IMAGES_CHOSEN_ID_SS = 'images_chosen_id';
const IMAGES_FALLBACK_ID_SS = 'images_fallback_id';
const IMAGES_LASTCHOSEN_SS = 'images_lastchosen';
const IMAGES_LASTUPDATED_SS = 'images_lastupdated';
const IMAGES_IMAGE_SET_SS = 'images_image_set';
//others
const IMAGES_CHOOSE_INTERVAL_MILLIS = 60 * 1000; //1 minute
const IMAGES_FALLBACKS = ['images/0.jpg', 'images/1.jpg', 'images/2.jpg', 
                          'images/3.jpg', 'images/4.jpg', 'images/5.jpg', 
                          'images/6.jpg', 'images/7.jpg', 'images/8.jpg', 
                          'images/9.jpg', 'images/10.jpg'];
const IMAGES_UPDATE_INTERVAL_MILLIS = 24 * 60 * 60 * 1000; //24 hours
const IMAGES_UPDATE_WAIT_MILLIS = 10 * 1000; //10 seconds

/**
 * Images module.
 */
 var NewTabImages = {

    /**
     * Initializes images by requesting new images (if needed), saving them
     * to disk, and sending a random image to the content scripts.
     */
    initImages: function(worker) {
        newtab = require('main.js').NewTabMain;
        logger.log('Initializing images.');

        //immediately display an image
        NewTabImages.displayImage(worker);

        //request new images
        if(NewTabImages.shouldUpdate()) {
            NewTabImages.getImages(worker).
                then(NewTabImages.displayImage);
        }
    },

    /**
     * Choose an image and notifies content scripts to display it.
     */
    displayImage: function(worker) {
        var image = NewTabImages.getImage();
        if(image) {
            image.fallback = NewTabImages.getFallbackImage();
            utils.emit(newtab.workers, worker, IMAGES_DISPLAY_MSG, image);
        } else {
            logger.error('Cannot display invalid saved image.');
        }
     },

     /**
      * Chooses and displays an image that is different from the current image.
      */
    displayNextImage: function(worker) {
        clearChosenImage();
        NewTabImages.displayImage(worker);
    },

    /**
     * Clears chosen image.
     */
    clearChosenImage: function() {
        ss.storage[IMAGES_LASTCHOSEN_SS] = null;
    },

    /**
     * Returns one of the saved images to display. 
     */
    getImage: function() {
        //no image displayed
        var lastChosen = ss.storage[IMAGES_LASTCHOSEN_SS];
        var chosenId = ss.storage[IMAGES_CHOSEN_ID_SS];
        if(!lastChosen || !chosenId) {
            return NewTabImages.chooseNewImage();
        } else {
            //check when the last image was chosen
            var now = Date.now();
            var elapsed = now - lastChosen;
            //choose new image
            if(elapsed >= IMAGES_CHOOSE_INTERVAL_MILLIS) {
                return NewTabImages.chooseNewImage();
            }
        }
        return ss.storage[IMAGES_IMAGE_SET_SS].images[chosenId];
    },

    /**
     * Chooses and returns a new image to be displayed.
     */
    chooseNewImage: function() {
        logger.info('Choosing new image.');
        var imageSet = ss.storage[IMAGES_IMAGE_SET_SS];
        if(!imageSet || !imageSet.images) {
            return null;
        }

        //choose next image 
        var images = imageSet.images;
        var chosenId = ss.storage[IMAGES_CHOSEN_ID_SS];
        chosenId = chosenId ? (parseInt(chosenId, 10) + 1) % images.length : 0;

        //save chosen image
        ss.storage[IMAGES_CHOSEN_ID_SS] = chosenId.toString();
        ss.storage[IMAGES_LASTCHOSEN_SS] = Date.now();

        return images[chosenId];
    },

    /**
     * Returns a fallback image to be displayed in case the original image
     * fails to load.
     */
    getFallbackImage: function() {
        var fallbackId = ss.storage[IMAGES_FALLBACK_ID_SS];
        fallbackId = fallbackId ? (parseInt(fallbackId, 10) + 1) % IMAGES_FALLBACKS.length : 0;
        ss.storage[IMAGES_FALLBACK_ID_SS] = fallbackId.toString();
        return IMAGES_FALLBACKS[fallbackId];
    },

    /**
     * Returns whether new images should be requested.
     */
    shouldUpdate: function() {
        //no images exist
        var lastUpdated = ss.storage[IMAGES_LASTUPDATED_SS];
        if(!lastUpdated) {
            return true;
        }

        //check when the images were last updated
        var now = Date.now();
        var elapsed = now - lastUpdated;

        return (elapsed >= IMAGES_UPDATE_INTERVAL_MILLIS);
    },

    /**
     * Returns a promise that is fulfilled with the images requested from
     * the image sources.
     */
    getImages: function(worker) {
        logger.info('Requesting images.');
        //prevent other updates from happening during this update
        NewTabImages.disableUpdates(IMAGES_UPDATE_WAIT_MILLIS);
        //clear current chosen image
        NewTabImages.clearChosenImage();
        //request images
        return parse.getNextImageSet().
            then(function(imageSet) {
                //save images
                ss.storage[IMAGES_IMAGE_SET_SS] = imageSet;
                ss.storage[IMAGES_LASTUPDATED_SS] = Date.now();
                return worker;
            }, function(error) {
                logger.warn('Forcing next image update because of', error);
                //force next image update
                ss.storage[IMAGES_LASTUPDATED_SS] = null;
            });
    },

    /**
     * Disables updates for the specified milliseconds.
     */
    disableUpdates: function(millis) {
       ss.storage[IMAGES_LASTUPDATED_SS] = Date.now() -
            IMAGES_UPDATE_INTERVAL_MILLIS + millis; 
    }
 };

exports.NewTabImages = NewTabImages;
