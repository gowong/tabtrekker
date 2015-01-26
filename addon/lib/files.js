'use strict';

/* SDK Modules */
const {Cu} = require('chrome');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/Promise.jsm');
Cu.import('resource://gre/modules/Task.jsm');

/* Modules */
const logger = require('logger').TabTrekkerLogger;

/* Constants */
const FILES_PROFILE_TABTREKKER_DIR = 'tabtrekker';

/**
 * Files modules.
 */
var TabTrekkerFiles = {

    /**
     * Returns a promise that is fulfilled with the specified path.
     * Creates the path if it doesn't already exist.
     */
    getOrCreatePath: function(path, from) {
        return OS.File.makeDir(path, {
            from: from,
            ignoreExisting: true
        }).then(function() {
            return OS.Path.join(from, path);
        }, function(error) {
            logger.error('Error creating path ' + path, error);
            throw error;
        });
    },

    /**
     * Returns a promise that is fulfilled with the specified path in the
     * user's profile directory. Creates the path if it doesn't already exist.
     */
    getOrCreatePathInProfile: function(path) {
        path = OS.Path.join(TabTrekkerFiles.getProfilePath(), path);
        return TabTrekkerFiles.getOrCreatePath(path, OS.Constants.Path.profileDir);
    },

    /**
     * Returns the path at the addon's directory inside the user's profile
     * directory.
     */
    getProfilePath: function() {
        return OS.Path.join(OS.Constants.Path.profileDir,
            FILES_PROFILE_TABTREKKER_DIR);
    },

    /**
     * Returns a promise that is fulfilled with whether or not the file exists.
     */
    fileUriExists: function(fileUri) {
        return Task.spawn(function*() {
            if(!fileUri) {
                return false;
            }
            let path = OS.Path.fromFileURI(fileUri);
            return yield OS.File.exists(path);
        }).then(null, function(error) {
            logger.error('Error checking if file exists ' + fileUri, error);
            throw error;
        });
    },

    /**
     * Removes all files and directories that are located in the path
     * and satisfy the filter.
     */
    removeInPath: function(path, filter) {
        return Task.spawn(function*() {
            let iterator = new OS.File.DirectoryIterator(path);
            let removePromises = [];

            //iterate through directory
            yield iterator.forEach(function(entry) {
                //remove file if it passes filter
                if(filter(entry)) {
                    let removePromise;
                    let path = entry.path;
                    logger.log('Removing', path);
                    if (entry.isDir) {
                        removePromise = OS.File.removeDir(path)
                    } else {
                        removePromise = OS.File.remove(path);
                    }
                    removePromises.push(removePromise);
                }
            //close iterator
            }).then(function() {
                iterator.close();
            }, function(error) {
                logger.error('Error iterating through directory', error);
                iterator.close();
                throw error;
            });

            //wait for all files to be removed
            return yield Promise.all(removePromises);

        }).then(null, function(error) {
            logger.error('Error removing file', error);
            throw error;
        });
    }
};

exports.TabTrekkerFiles = TabTrekkerFiles;
