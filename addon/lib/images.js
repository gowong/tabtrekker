'use strict';

/* SDK Modules */
const ss = require('sdk/simple-storage');

/* Modules */
const chromecast = require('chromecast.js').NewTabChromecast;
const logger = require('logger.js').NewTabLogger;
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
const IMAGES_METADATA_SS = 'images_metadata';
//others
const IMAGES_CHOOSE_INTERVAL_MILLIS = 60 * 1000; //1 minute
const IMAGES_FALLBACKS = ['images/0.jpg', 'images/1.jpg', 'images/2.jpg', 
                          'images/3.jpg', 'images/4.jpg', 'images/5.jpg', 
                          'images/6.jpg', 'images/7.jpg', 'images/8.jpg', 
                          'images/9.jpg', 'images/10.jpg'];
const IMAGES_NUM_PER_UPDATE = 15;
const IMAGES_UPDATE_INTERVAL_MILLIS = 24 * 60 * 60 * 1000; //24 hours
const IMAGES_UPDATE_WAIT_MILLIS = 50 * 1000; //10 seconds

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
                then(NewTabImages.displayImage).
                then(null, logger.error);
        }
    },

    /**
     * Choose an image and notifies content scripts to display it.
     */
     displayImage: function(worker) {
        var image = NewTabImages.getSavedImage();
        image.fallback = NewTabImages.getFallbackImage();
        if(image) {
            utils.emit(newtab.workers, worker, IMAGES_DISPLAY_MSG, image);
        }
     },

     /**
      * Chooses and displays an image that is different from the current image.
      */
    displayNextImage: function(worker) {
        //force a new image to be chosen, but don't delete the current chosen
        //image id as it is needed to cycle the next image
        ss.storage[IMAGES_LASTCHOSEN_SS] = null;
        NewTabImages.displayImage(worker);
    },

    /**
     * Clears chosen image.
     */
    clearChosenImage: function() {
        ss.storage[IMAGES_CHOSEN_ID_SS] = null;
        ss.storage[IMAGES_LASTCHOSEN_SS] = null;
    },

    /**
     * Returns one of the saved images to display. 
     */
    getSavedImage: function() {
        //no image displayed
        var lastChosen = ss.storage[IMAGES_LASTCHOSEN_SS];
        var chosenId = ss.storage[IMAGES_CHOSEN_ID_SS];
        if(!lastChosen || !chosenId) {
            chosenId = NewTabImages.getNewImageId();
        } else {
            //check when the last image was chosen
            var now = Date.now();
            var elapsed = now - lastChosen;
            //choose new image
            if(elapsed >= IMAGES_CHOOSE_INTERVAL_MILLIS) {
                chosenId = NewTabImages.getNewImageId();
            }
        }
        return ss.storage[IMAGES_METADATA_SS][chosenId];
    },

    /**
     * Chooses a new image to be displayed and returns its id.
     */
    getNewImageId: function() {
        logger.log('Choosing new image.');
        var images = ss.storage[IMAGES_METADATA_SS];
        if(!images) {
            NewTabImages.clearChosenImage();
            return null;
        }
        var chosenId = ss.storage[IMAGES_CHOSEN_ID_SS];
        //choose next image or choose a random image if this is the first
        //time choosing
        chosenId = chosenId ? (parseInt(chosenId, 10) + 1) % images.length
            : Math.floor(Math.random() * images.length);
        ss.storage[IMAGES_CHOSEN_ID_SS] = chosenId.toString();
        ss.storage[IMAGES_LASTCHOSEN_SS] = Date.now();
        return chosenId;
    },

    /**
     * Returns a fallback image to be displayed in case the original image
     * fails to load.
     */
    getFallbackImage: function() {
        var fallbackId = ss.storage[IMAGES_FALLBACK_ID_SS];
        fallbackId = fallbackId ? (parseInt(fallbackId, 10) + 1) % IMAGES_FALLBACKS.length
            : Math.floor(Math.random() * IMAGES_FALLBACKS.length);
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
        logger.log('Requesting images.');
        //set last updated time to in the future so no other updates will
        //happen during this update
        ss.storage[IMAGES_LASTUPDATED_SS] = Date.now() + IMAGES_UPDATE_WAIT_MILLIS;
        //clear current chosen image
        NewTabImages.clearChosenImage();
        //request images
        return chromecast.getImages(IMAGES_NUM_PER_UPDATE).
            then(function(images) {
                //save images
                ss.storage[IMAGES_METADATA_SS] = images;
                ss.storage[IMAGES_LASTUPDATED_SS] = Date.now();
                return worker;
            });
    }
 };

exports.NewTabImages = NewTabImages;
