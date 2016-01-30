'use strict';

/* SDK Modules */
const {Cu, Ci} = require('chrome');
Cu.import('resource://gre/modules/Downloads.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/Promise.jsm');
Cu.import('resource://gre/modules/Task.jsm');
Cu.import('resource://gre/modules/Services.jsm');
const array = require('sdk/util/array');
const self = require('sdk/self');
const simplePrefs = require('sdk/simple-prefs');
const timers = require('sdk/timers');

/* Modules */
const files = require('./files').TabTrekkerFiles;
const logger = require('./logger').TabTrekkerLogger;
const parse = require('./parse').TabTrekkerParse;
const utils = require('./utils').TabTrekkerUtils;
var tabtrekker; //load on initialization to ensure main module is loaded

/* Constants */
//messages
const IMAGES_SHOW_LOADING_MSG = 'images_show_loading';
const IMAGES_DISPLAY_MSG = 'images_display';
//preferences
const SHOW_IMAGE_INFO_PREF = 'show_image_info';
const IMAGES_PREFS = 'images';
const IMAGES_CHOSEN_ID_PREFS = 'images_chosen_id';
const IMAGES_FALLBACK_ID_PREFS = 'images_fallback_id';
const IMAGES_LASTCHOSEN_TIME_PREFS = 'images_lastchosen';
const IMAGES_LASTUPDATED_TIME_PREFS = 'images_lastupdated';
const IMAGES_IMAGE_SET_PREFS = 'images_image_set';
//others
const IMAGES_RESOURCE_URI_PROTOCOL = 'resource://';
const IMAGES_RESOURCE_URI_PREFIX = IMAGES_RESOURCE_URI_PROTOCOL + 'tabtrekker_image_';
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
    inProgressDownloadTargets: [],

    /**
     * Initializes images by requesting new images (if needed), saving them
     * to disk, and sending a random image to the content scripts.
     */
    initImages: function(worker) {
        tabtrekker = require('./main').TabTrekkerMain;
        logger.log('Initializing images.');
        return Task.spawn(function*() {
            if(TabTrekkerImages.shouldUpdate()) {
                //show loading spinner
                utils.emit(tabtrekker.workers, worker, IMAGES_SHOW_LOADING_MSG);
                //request new images
                yield TabTrekkerImages.updateImages(worker);
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
        //choose new image
        if(chooseNewImage || TabTrekkerImages.shouldChooseNewImage()) {
            TabTrekkerImages.chooseNewImage();
        }

        //get image to display
        var data = TabTrekkerImages.getChosenImage() || {};
        var image = data.image;
        data.fallback = TabTrekkerImages.getFallbackImage();
        data[SHOW_IMAGE_INFO_PREF] = simplePrefs.prefs[SHOW_IMAGE_INFO_PREF];

        //point image's resource URI to image's file URI
        if(image.resourceUri && image.fileUri) {
            var baseImageResourceUri = image.resourceUri
                .substr(IMAGES_RESOURCE_URI_PROTOCOL.length);
            let res = Services.io.getProtocolHandler('resource')
                .QueryInterface(Ci.nsIResProtocolHandler);
            res.setSubstitution(baseImageResourceUri,
                Services.io.newURI(image.fileUri, null, null));
        }

        utils.emit(tabtrekker.workers, worker, IMAGES_DISPLAY_MSG, data);
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
        var lastChosen = parseFloat(
            simplePrefs.prefs[IMAGES_LASTCHOSEN_TIME_PREFS]);
        var chosenId = simplePrefs.prefs[IMAGES_CHOSEN_ID_PREFS];
        
        //no image previously chosen
        if((!lastChosen && lastChosen !== 0)
            || (!chosenId && chosenId !== 0)) {
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
        var imageSet = TabTrekkerImages.getImageSet();
        if(!imageSet) {
            return null;
        }
        var images = TabTrekkerImages.getImages();
        if(!images || images.length === 0) {
            return null;
        }

        //get image
        var chosenId = simplePrefs.prefs[IMAGES_CHOSEN_ID_PREFS];
        var image = images[chosenId];

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
        var imageSet = TabTrekkerImages.getImageSet();
        if(!imageSet || imageSet.numImages === 0) {
            return;
        }

        //choose next image 
        var chosenId = simplePrefs.prefs[IMAGES_CHOSEN_ID_PREFS];
        chosenId = chosenId == null ? 0 : ((chosenId + 1) % imageSet.numImages);

        //save chosen image
        TabTrekkerImages.setChosenImage(chosenId);
    },

    /**
     * Sets the chosen image.
     */
    setChosenImage: function(chosenId) {
        simplePrefs.prefs[IMAGES_CHOSEN_ID_PREFS] = chosenId;
        simplePrefs.prefs[IMAGES_LASTCHOSEN_TIME_PREFS] = String(Date.now());
    },

    /**
     * Returns a fallback image to be displayed in case the original image
     * fails to load.
     */
    getFallbackImage: function() {
        var fallbackId = simplePrefs.prefs[IMAGES_FALLBACK_ID_PREFS];
        fallbackId = fallbackId == null ? 0 : ((fallbackId + 1) % IMAGES_FALLBACKS.length);
        simplePrefs.prefs[IMAGES_FALLBACK_ID_PREFS] = fallbackId;
        return self.data.url(IMAGES_FALLBACKS[fallbackId]);
    },

    /**
     * Returns whether new images should be requested.
     */
    shouldUpdate: function() {
        //images have never been updated
        var lastUpdated = parseFloat(
            simplePrefs.prefs[IMAGES_LASTUPDATED_TIME_PREFS]);
        if(!lastUpdated && lastUpdated !== 0) {
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
    updateImages: function(worker) {
        logger.info('Requesting images.');
        //prevent other updates from happening during this update
        TabTrekkerImages.disableUpdates(IMAGES_UPDATE_WAIT_MILLIS);
        //request images
        return parse.getNextImageSet().
            then(function(imageSet) {
                //save images
                var images = imageSet.images;
                TabTrekkerImages.saveImages(images);

                //only save image set
                delete imageSet.images;
                TabTrekkerImages.saveImageSet(imageSet, images.length);

                simplePrefs.prefs[IMAGES_LASTUPDATED_TIME_PREFS] = String(Date.now());
                TabTrekkerImages.setChosenImage(imageSet.startingImageId);
                return worker;
            }, function(error) {
                logger.warn('Forcing next image update because of', error.message);
                //force next image update
                simplePrefs.prefs[IMAGES_LASTUPDATED_TIME_PREFS] = '';
            });
    },

    /**
     *  Returns the current image set.
     */
    getImageSet: function() {
        var imageSet = simplePrefs.prefs[IMAGES_IMAGE_SET_PREFS];
        return imageSet ? JSON.parse(imageSet) : null;
    },

    /**
     * Saves the image set.
     */
    saveImageSet: function(imageSet, numImages) {
        imageSet.numImages = numImages;
        simplePrefs.prefs[IMAGES_IMAGE_SET_PREFS] = JSON.stringify(imageSet);
    },

    /**
     * Returns the current collection of images.
     */
    getImages: function() {
        var images = simplePrefs.prefs[IMAGES_PREFS];
        return images ? JSON.parse(images) : null;
    },

    /**
     * Saves the collection of images.
     */
    saveImages: function(images) {
        simplePrefs.prefs[IMAGES_PREFS] = JSON.stringify(images);
    },

    /**
     * Disables updates for the specified milliseconds.
     */
    disableUpdates: function(millis) {
        var lastUpdated = String(Date.now() - IMAGES_UPDATE_INTERVAL_MILLIS
            + millis);
        simplePrefs.prefs[IMAGES_LASTUPDATED_TIME_PREFS] = lastUpdated; 
    },

    /**
     * Downloads any of the images in the saved image set that haven't already
     * been downloaded. Returns a promise that is fulfilled when all images
     * have been downloaded.
     */
    downloadImages: function() {
        let imageSet = TabTrekkerImages.getImageSet();
        if(!imageSet) {
            logger.info('No images to download.');
            return;
        }
        let images = TabTrekkerImages.getImages();
        if(!images || images.length === 0) {
            logger.info('No images to download.');
            return;
        }
        return Task.spawn(function*() {
            let downloadResults = [];

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

                //create download
                let download = yield Downloads.createDownload({
                    source: source,
                    target: target
                });

                //start download
                let downloadResult = download.start().
                    then(function() {
                        logger.info('Download complete', target);
                        //remove from in progress downloads
                        array.remove(TabTrekkerImages.inProgressDownloadTargets, target);
                        //save downloaded image uris
                        TabTrekkerImages.saveImageUris(imageSet.id, index, target);
                    }, function(error) {
                        logger.error('Download failed', target);
                        //remove from in progress downloads
                        array.remove(TabTrekkerImages.inProgressDownloadTargets, target);
                        //ensures download is stopped and removes partial data
                        //so that the download can be retried next time
                        download.finalize(true);
                    });

                //keep track of downloads
                downloadResults.push(downloadResult);
                TabTrekkerImages.inProgressDownloadTargets.push(target);
            }

            //wait for all downloads to complete
            yield Promise.all(downloadResults);
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
            for(var i = 0; i < TabTrekkerImages.inProgressDownloadTargets.length; i++) {
                let inProgressDownloadTarget = TabTrekkerImages.inProgressDownloadTargets[i];
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
     * Converts the path to a file and resource URI and saves it for the
     * specified image.
     */
    saveImageUris: function(imageSetId, imageId, path) {
        var fileUri = OS.Path.toFileURI(path);
        var resourceUri = IMAGES_RESOURCE_URI_PREFIX
            + String(imageSetId) + '_' + String(imageId);
        var images = TabTrekkerImages.getImages();
        images[imageId].fileUri = fileUri;
        images[imageId].resourceUri = resourceUri;
        TabTrekkerImages.saveImages(images);
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
            return yield files.removeInDirectory(imagesPath, filter);
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
