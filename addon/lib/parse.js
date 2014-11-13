'use strict';

/* SDK Modules */
const {Cu} = require('chrome');
Cu.import('resource://gre/modules/Promise.jsm');
const Request = require('sdk/request').Request;
const ss = require('sdk/simple-storage');

/* Modules */
const config = require('config.js').NewTabConfig;
const logger = require('logger.js').NewTabLogger;

/* Constants */
//simple storage
const PARSE_IMAGE_SET_ID_SS = 'parse_image_set_id';
const PARSE_GET_NEXT_IMAGE_SET_URL ='https://api.parse.com/1/functions/getNextImageSet';

/**
 * Parse backend module.
 */
var NewTabParse = {

    /**
     * Returns a promise that is fulfilled with the retrieved images.
     */
    getNextImageSet: function() {
        logger.info('Requesting next image set from Parse.');
        var data = {
            id: ss.storage[PARSE_IMAGE_SET_ID_SS]
        };
        //request image set
        return NewTabParse.request(PARSE_GET_NEXT_IMAGE_SET_URL, data).
            then(function(imageSet) {
                if(!imageSet || !imageSet.images || imageSet.images.length == 0) {
                    throw new Error('Parse response contained no images.');
                }
                //store image set id
                ss.storage[PARSE_IMAGE_SET_ID_SS] = imageSet.id;
                return imageSet;
            });
    },

    /**
     * Returns a promise that is fulfilled with the response to the request.
     */
    request: function(url, dataObj) {
        return new Promise(function(resolve, reject) {
            Request({
                url: url,
                headers: {
                    'X-Parse-Application-Id': config.getParseAppId(),
                    'X-Parse-REST-API-Key': config.getParseRestApiKey()
                },
                contentType: 'application/json',
                content: JSON.stringify(dataObj),
                onComplete: function(response) {
                    if(response.status != 200) {
                        reject(new Error('Parse request failed.'));
                        return;
                    }
                    resolve(response.json.result);
                }
            }).post();
        });
    }
};

exports.NewTabParse = NewTabParse;
