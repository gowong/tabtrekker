'use strict';

/* SDK Modules */
const {Cu} = require('chrome');
Cu.import('resource://gre/modules/Downloads.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/Promise.jsm');
Cu.import('resource://gre/modules/Task.jsm');
const array = require('sdk/util/array');
const ss = require('sdk/simple-storage');

/* Modules */
const files = require('files.js').NewTabFiles;
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
const IMAGES_DOWNLOAD_DIR = 'images';
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
     * List of in progress downloads.
     */
    downloadTargets: [],

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

        //download images if needed
        NewTabImages.downloadImages().
            then(NewTabImages.removeDownloadedImages);
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
        NewTabImages.clearChosenImage();
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
        var imageSet = ss.storage[IMAGES_IMAGE_SET_SS];
        if(!imageSet) {
            return null;
        }
        var image;

        //no image displayed
        var lastChosen = ss.storage[IMAGES_LASTCHOSEN_SS];
        var chosenId = ss.storage[IMAGES_CHOSEN_ID_SS];
        if(!lastChosen || !chosenId) {
            image = NewTabImages.chooseNewImage();
        } else {
            //check when the last image was chosen
            var now = Date.now();
            var elapsed = now - lastChosen;
            //choose new image
            if(elapsed >= IMAGES_CHOOSE_INTERVAL_MILLIS) {
                image = NewTabImages.chooseNewImage();
            } 
            //get current image
            else {
                image = ss.storage[IMAGES_IMAGE_SET_SS].images[chosenId];
            }
        }
        //add image set info
        if(image) {
            image.imageSetName = imageSet.name;
            image.imageSetInfoUrl = imageSet.infoUrl;
        }
        return image;
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
    },

    /**
     * Downloads any of the images in the saved image set that haven't already
     * been downloaded. Returns a promise that is fulfilled when all images
     * have been downloaded.
     */
    downloadImages: function() {
        return Task.spawn(function*() {
            let imageSet = ss.storage[IMAGES_IMAGE_SET_SS];
            if(!imageSet || !imageSet.images) {
                logger.warn('No images to download.');
                throw new Error('No images to download.');
            }
            logger.log('Downloading images.');

            let images = imageSet.images;
            let downloadPromises = [];

            for(var i = 0; i < images.length; i++) {
                let index = i; //use current iteration in inner functions
                let image = images[i];

                //create download directory if needed
                let target = yield NewTabImages.getOrCreateDownloadPath(
                    imageSet, image, index);
                let source = image.imageUrl;

                //only download images that haven't already been downloaded
                let shouldDownload = yield NewTabImages.shouldDownloadImage(
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
                        array.remove(NewTabImages.downloadTargets, target);
                        //save downloaded image file uri
                        NewTabImages.saveImageFileUri(index, target);
                    });

                //keep track of downloads
                downloadPromises.push(download);
                NewTabImages.downloadTargets.push(target);
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
            for(var i = 0; i < NewTabImages.downloadTargets.length; i++) {
                let inProgressDownloadTarget = NewTabImages.downloadTargets[i];
                //image download is already in progress
                if(downloadTarget == inProgressDownloadTarget) {
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
            let imageSetPath = OS.Path.join(IMAGES_DOWNLOAD_DIR, imageSetFolder);

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
            let imagesPath = yield NewTabImages.getOrCreateImagesPath();
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

exports.NewTabImages = NewTabImages;
