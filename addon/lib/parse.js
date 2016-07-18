'use strict';

/* SDK Modules */
const {Cu} = require('chrome');
Cu.import('resource://gre/modules/Promise.jsm');
Cu.import('resource://gre/modules/Task.jsm');
const array = require('sdk/util/array');
const Request = require('sdk/request').Request;
const simplePrefs = require('sdk/simple-prefs');
const ss = require('sdk/simple-storage');

/* Modules */
const secrets = require('./secrets').TabTrekkerSecrets;
const logger = require('./logger').TabTrekkerLogger;

/* Constants */
//simple storage
const PARSE_IMAGE_SET_ID_SS = 'parse_image_set_id';
const PARSE_VIEWED_IMAGE_SET_IDS_SS = 'parse_viewed_image_set_ids';
//preferences
const PARSE_IMAGE_SET_ID_PREFS = 'parse_image_set_id';
const PARSE_VIEWED_IMAGE_SET_IDS_PREFS = 'parse_viewed_image_set_ids';
//others
const PARSE_GET_NEXT_IMAGE_SET_URL = 'https://app.tabtrekker.com/parse/functions/getNextImageSet';

/**
 * Parse backend module.
 */
var TabTrekkerParse = {

    /**
     * Returns a promise that is fulfilled with the retrieved images.
     */
    getNextImageSet: function() {
        return Task.spawn(function*() {
            logger.info('Requesting next image set from Parse.');
            let data = {
                id: TabTrekkerParse.getImageId(),
                viewedIds: TabTrekkerParse.getViewedImageSets()
            };
            //request image set
            let imageSet = yield TabTrekkerParse.request(
                PARSE_GET_NEXT_IMAGE_SET_URL, data);
            if(!imageSet || !imageSet.images || imageSet.images.length === 0) {
                logger.error('Parse response contained no images.', imageSet);
                throw new Error('Parse response contained no images.');
            }
            //store image set id
            simplePrefs.prefs[PARSE_IMAGE_SET_ID_PREFS] = imageSet.id;
            //add to viewed image sets
            TabTrekkerParse.addViewedImageSet(imageSet);
            return imageSet;
        });
    },

    /**
     * Returns a promise that is fulfilled with the response to the request.
     */
    request: function(url, dataObj) {
        return new Promise(function(resolve, reject) {
            logger.info('Request to Parse ' + url, dataObj);
            Request({
                url: url,
                headers: {
                    'X-Parse-Application-Id': secrets.getParseAppId(),
                    'X-Parse-REST-API-Key': secrets.getParseRestApiKey()
                },
                contentType: 'application/json',
                content: JSON.stringify(dataObj),
                onComplete: function(response) {
                    if(response.status != 200) {
                        logger.error('Parse request failed.', response);
                        reject(new Error('Parse request failed.'));
                        return;
                    }
                    resolve(response.json.result);
                }
            }).post();
        });
    },

    /**
     * Returns the current image set id. Handles migrating from simple-storage
     * to simple-prefs.
     */
    getImageId: function() {
        var ssId = ss.storage[PARSE_IMAGE_SET_ID_SS];
        if(ssId != null) {
            //migrate from simple storage to simple prefs
            simplePrefs.prefs[PARSE_IMAGE_SET_ID_PREFS] = ssId;
            //remove from simple-storage
            delete ss.storage[PARSE_IMAGE_SET_ID_SS];
        }
        return simplePrefs.prefs[PARSE_IMAGE_SET_ID_PREFS];
    },

    /**
     * Adds the image set to the collection of viewed image sets.
     */
    addViewedImageSet: function(imageSet) {
        if(!imageSet || imageSet.id == null) {
            return;
        }
        var viewedImageSetIds = TabTrekkerParse.getViewedImageSets();
        array.add(viewedImageSetIds, imageSet.id);
        simplePrefs.prefs[PARSE_VIEWED_IMAGE_SET_IDS_PREFS] = 
            JSON.stringify(viewedImageSetIds);
    },

    /**
     * Returns the viewed image sets. Handles migrating from simple-storage
     * to simple-prefs.
     */
    getViewedImageSets: function() {
        var ssViewedImageSets = ss.storage[PARSE_VIEWED_IMAGE_SET_IDS_SS];
        if(ssViewedImageSets && ssViewedImageSets.length > 0) {
            //migrate from simple storage to simple prefs
            simplePrefs.prefs[PARSE_VIEWED_IMAGE_SET_IDS_PREFS] = 
                JSON.stringify(ssViewedImageSets);
            //remove from simple-storage
            delete ss.storage[PARSE_VIEWED_IMAGE_SET_IDS_SS];
        }
        var viewedImageSetIds = simplePrefs.prefs[PARSE_VIEWED_IMAGE_SET_IDS_PREFS];
        return viewedImageSetIds ? JSON.parse(viewedImageSetIds) : [];
    }
};

exports.TabTrekkerParse = TabTrekkerParse;
