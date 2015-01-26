'use strict';

/* SDK Modules */
const {Cu} = require('chrome');
Cu.import('resource://gre/modules/Downloads.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/Promise.jsm');
Cu.import('resource://gre/modules/Task.jsm');
const array = require('sdk/util/array');
const ss = require('sdk/simple-storage');
const timers = require('sdk/timers');

/* Modules */
const files = require('files').TabTrekkerFiles;
const logger = require('logger').TabTrekkerLogger;
const parse = require('parse').TabTrekkerParse;
const utils = require('utils').TabTrekkerUtils;
var tabtrekker; //load on initialization to ensure main module is loaded

/* Constants */
//messages
const IMAGES_DISPLAY_MSG = 'images_display';
//simple storage
const IMAGES_CHOSEN_ID_SS = 'images_chosen_id';
const IMAGES_FALLBACK_ID_SS = 'images_fallback_id';
const IMAGES_LASTCHOSEN_TIME_SS = 'images_lastchosen';
const IMAGES_LASTUPDATED_TIME_SS = 'images_lastupdated';
const IMAGES_IMAGE_SET_SS = 'images_image_set';
//others
const IMAGES_CHOOSE_INTERVAL_MILLIS = 5 * 60 * 1000; //5 minutes
const IMAGES_DOWNLOAD_DELAY = 15 * 1000; //15 seconds
const IMAGES_DOWNLOAD_DIR = 'images';
const IMAGES_FALLBACKS = ['images/0.jpg', 'images/1.jpg', 'images/2.jpg', 
                          'images/3.jpg', 'images/4.jpg', 'images/5.jpg'];
const IMAGES_UPDATE_INTERVAL_MILLIS = 24 * 60 * 60 * 1000; //24 hours
const IMAGES_UPDATE_WAIT_MILLIS = 15 * 1000; //15 seconds

/**
 * Images module.
 */
 var TabTrekkerImages = {

    /**
     * List of in progress downloads.
     */
    downloadTargets: [],

    /**
     * Initializes images by requesting new images (if needed), saving them
     * to disk, and sending a random image to the content scripts.
     */
    initImages: function(worker) {
        tabtrekker = require('main').TabTrekkerMain;
        logger.log('Initializing images.');
        return Task.spawn(function*() {
            //request new images
            if(TabTrekkerImages.shouldUpdate()) {
                yield TabTrekkerImages.getImages(worker);
            }

            //display saved image
            TabTrekkerImages.displayImage(worker, false);

            //download images if needed
            timers.setTimeout(function() {
                TabTrekkerImages.downloadImages().
                    then(TabTrekkerImages.removeDownloadedImages);
            }, IMAGES_DOWNLOAD_DELAY);
        });
    },

    /**
     * Choose an image and notifies content scripts to display it.
     */
    displayImage: function(worker, chooseNewImage) {
        if(chooseNewImage || TabTrekkerImages.shouldChooseNewImage()) {
            TabTrekkerImages.chooseNewImage();
        }
        var image = TabTrekkerImages.getChosenImage() || {};
        image.fallback = TabTrekkerImages.getFallbackImage();
        utils.emit(tabtrekker.workers, worker, IMAGES_DISPLAY_MSG, image);
     },

     /**
      * Chooses and displays an image that is different from the current image.
      */
    displayNextImage: function(worker) {
        TabTrekkerImages.displayImage(worker, true);
    },

    /**
      * Returns whether a new image should be chosen.
      */
    shouldChooseNewImage: function() {
        var lastChosen = ss.storage[IMAGES_LASTCHOSEN_TIME_SS];
        var chosenId = ss.storage[IMAGES_CHOSEN_ID_SS];
        
        //no image previously chosen
        if(lastChosen == null || chosenId == null) {
            return true;
        }

        //check when the previous image was chosen
        var now = Date.now();
        var elapsed = now - lastChosen;
        
        return (elapsed >= IMAGES_CHOOSE_INTERVAL_MILLIS);
    },

    /**
     * Returns the chosen images to display.
     */
    getChosenImage: function() {
        var imageSet = ss.storage[IMAGES_IMAGE_SET_SS];
        if(!imageSet) {
            return null;
        }

        //get image
        var chosenId = ss.storage[IMAGES_CHOSEN_ID_SS];
        var image = ss.storage[IMAGES_IMAGE_SET_SS].images[chosenId];

        //add image set info
        return {
            image: image,
            imageSetName: imageSet.name,
            imageSetInfoUrl: imageSet.infoUrl
        };
    },

    /**
     * Chooses a new image to be displayed.
     */
    chooseNewImage: function() {
        logger.info('Choosing new image.');
        var imageSet = ss.storage[IMAGES_IMAGE_SET_SS];
        if(!imageSet || !imageSet.images || imageSet.images.length === 0) {
            return;
        }

        //choose next image 
        var images = imageSet.images;
        var chosenId = ss.storage[IMAGES_CHOSEN_ID_SS];
        chosenId = chosenId == null ? 0 : ((chosenId + 1) % images.length);

        //save chosen image
        TabTrekkerImages.setChosenImage(chosenId);
    },

    /**
     * Sets the chosen image.
     */
    setChosenImage: function(chosenId) {
        ss.storage[IMAGES_CHOSEN_ID_SS] = chosenId;
        ss.storage[IMAGES_LASTCHOSEN_TIME_SS] = Date.now();
    },

    /**
     * Returns a fallback image to be displayed in case the original image
     * fails to load.
     */
    getFallbackImage: function() {
        var fallbackId = ss.storage[IMAGES_FALLBACK_ID_SS];
        fallbackId = fallbackId == null ? 0 : ((fallbackId + 1) % IMAGES_FALLBACKS.length);
        ss.storage[IMAGES_FALLBACK_ID_SS] = fallbackId;
        return IMAGES_FALLBACKS[fallbackId];
    },

    /**
     * Returns whether new images should be requested.
     */
    shouldUpdate: function() {
        //images have never been updated
        var lastUpdated = ss.storage[IMAGES_LASTUPDATED_TIME_SS];
        if(lastUpdated == null) {
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
        TabTrekkerImages.disableUpdates(IMAGES_UPDATE_WAIT_MILLIS);
        //request images
        return parse.getNextImageSet().
            then(function(imageSet) {
                //save images
                ss.storage[IMAGES_IMAGE_SET_SS] = imageSet;
                ss.storage[IMAGES_LASTUPDATED_TIME_SS] = Date.now();
                TabTrekkerImages.setChosenImage(imageSet.startingImageId);
                return worker;
            }, function(error) {
                logger.warn('Forcing next image update because of', error.message);
                //force next image update
                ss.storage[IMAGES_LASTUPDATED_TIME_SS] = null;
            });
    },

    /**
     * Disables updates for the specified milliseconds.
     */
    disableUpdates: function(millis) {
       ss.storage[IMAGES_LASTUPDATED_TIME_SS] = Date.now() -
            IMAGES_UPDATE_INTERVAL_MILLIS + millis; 
    },

    /**
     * Downloads any of the images in the saved image set that haven't already
     * been downloaded. Returns a promise that is fulfilled when all images
     * have been downloaded.
     */
    downloadImages: function() {
        let imageSet = ss.storage[IMAGES_IMAGE_SET_SS];
        if(!imageSet || !imageSet.images || imageSet.images.length === 0) {
            logger.info('No images to download.');
            return;
        }
        return Task.spawn(function*() {
            let images = imageSet.images;
            let downloadPromises = [];

            logger.log('Downloading images.');

            for(var i = 0; i < images.length; i++) {
                let index = i; //use current iteration in inner functions
                let image = images[i];

                //create download directory if needed
                let target = yield TabTrekkerImages.getOrCreateDownloadPath(
                    imageSet, image, index);
                let source = image.imageUrl;

                //only download images that haven't already been downloaded
                let shouldDownload = yield TabTrekkerImages.shouldDownloadImage(
                    image, target);
                if(!shouldDownload) {
                    continue;
                }

                logger.info('Downloading ' + source + ' to ' + target);

                //start download
                let download = Downloads.fetch(source, target).
                    then(function() {
                        logger.info('Download complete', target);
                        //remove completed download
                        array.remove(TabTrekkerImages.downloadTargets, target);
                        //save downloaded image file uri
                        TabTrekkerImages.saveImageFileUri(index, target);
                    });

                //keep track of downloads
                downloadPromises.push(download);
                TabTrekkerImages.downloadTargets.push(target);
            }

            //wait for all downloads to complete
            yield Promise.all(downloadPromises);
            logger.log('All downloads completed');

            return imageSet;

        }).then(null, function(error) {
            logger.error('Error downloading image', error);
            throw error;
        });
    },

    /**
     * Returns a promise that is fulfilled with whether or not the image should
     * be downloaded.
     */
    shouldDownloadImage: function(image, downloadTarget) {
        return Task.spawn(function*() {
            //iterate through in progress downloads
            for(var i = 0; i < TabTrekkerImages.downloadTargets.length; i++) {
                let inProgressDownloadTarget = TabTrekkerImages.downloadTargets[i];
                //image download is already in progress
                if(downloadTarget === inProgressDownloadTarget) {
                    return false;
                }
            }
            //don't download if image file exists
            return !(yield files.fileUriExists(image.fileUri));

        }).then(null, function(error) {
            logger.error('Error checking if downloaded image exists', error);
            throw error;
        });
    },

    /**
     * Returns a promise that is fulfilled with the path to download the image to.
     */
    getOrCreateDownloadPath: function(imageSet, image, imageTitle) {
        return Task.spawn(function*() {
            let url = image.imageUrl;
            let imageFormat = url.substring(url.lastIndexOf('.'));
            let imageSetFolder = imageSet.id;
            let imageSetPath = OS.Path.join(IMAGES_DOWNLOAD_DIR, String(imageSetFolder));

            //create image set directory if needed
            let path = yield files.getOrCreatePathInProfile(imageSetPath);

            //append image file to path
            return OS.Path.join(path, imageTitle + imageFormat);

        }).then(null, function(error) {
            logger.error('Error getting or creating download path', error);
            throw error;
        });
    },

    /**
     * Converts the path to a file URI and saves it for the specified image.
     */
    saveImageFileUri: function(id, path) {
        var fileUri = OS.Path.toFileURI(path);
        ss.storage[IMAGES_IMAGE_SET_SS].images[id].fileUri = fileUri;
    },

    /**
     * Removes all downloaded images not belonging to the specified image set.
     */
    removeDownloadedImages: function(imageSet) {
        logger.log('Removing downloaded images.');

        //remove images not belonging to this image set
        var filter = function(entry) {
            return entry.name != imageSet.id;
        };

        //remove all files in the images path that pass the filter
        return Task.spawn(function*() {
            let imagesPath = yield TabTrekkerImages.getOrCreateImagesPath();
            return yield files.removeInPath(imagesPath, filter);
        }).then(null, function(error) {
            logger.error('Error removing downloaded images', error);
            throw error;
        });
     },

    /**
     * Returns a promise that is fulfilled with the path to the images directory.
     * Creates the path if it doesn't already exist.
     */
    getOrCreateImagesPath: function() {
        return files.getOrCreatePathInProfile(IMAGES_DOWNLOAD_DIR);
    }
 };

exports.TabTrekkerImages = TabTrekkerImages;
