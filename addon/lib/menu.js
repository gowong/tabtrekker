'use strict';

/* SDK Modules */
const self = require('sdk/self');
const simplePrefs = require('sdk/simple-prefs');
const tabs = require('sdk/tabs');

/* Modules */
const images = require('images').TabTrekkerImages;
const logger = require('logger').TabTrekkerLogger;
const utils = require('utils').TabTrekkerUtils;
var tabtrekker; //load on initialization to ensure main module is loaded

/* Constants */
const HIDE_MENU_MSG = 'hide_menu';
const MENU_MSG = 'menu';
const NEXTIMAGE_MSG = 'menu_next_image';
const SETTINGS_MSG = 'menu_settings';
//preferences
const SHOW_MENU_PREF = 'show_menu';

/**
 * Menu module.
 */
var TabTrekkerMenu = {

    /**
     * Initializes menu by sending menu options to the content scripts.
     */
    initMenu: function(worker) {
        tabtrekker = require('main').TabTrekkerMain;

        //don't initialize menu when it is hidden
        var menuVisibility = simplePrefs.prefs[SHOW_MENU_PREF];
        if(menuVisibility === 'never') {
            utils.emit(tabtrekker.workers, worker, HIDE_MENU_MSG);
            return;
        }

        logger.log('Initializing menu.');

        var options = {}
        options[SHOW_MENU_PREF] = menuVisibility;
        utils.emit(tabtrekker.workers, worker, MENU_MSG, options);

        TabTrekkerMenu.attachListeners(worker);
    },

    /**
     * Attaches listeners to listen for button click events.
     */
    attachListeners: function(worker) {
        logger.log('Attaching menu listeners.');
        worker.port.on(SETTINGS_MSG, TabTrekkerMenu.openSettings);
        worker.port.on(NEXTIMAGE_MSG, function() {
            images.displayNextImage(worker)
        });
    },
    
    /**
     * Opens addon settings page in new tab.
     */
    openSettings: function() {
        tabs.open({
            url: 'about:addons',
            onReady: function(tab) {
                tab.attach({
                    contentScriptWhen: 'end',
                    contentScript: 'AddonManager.getAddonByID("' + self.id
                        + '", function(aAddon) {\n' 
                        + 'unsafeWindow.gViewController.commands.cmd_showItemDetails.doCommand(aAddon, true);\n' 
                        + '});\n'
                });
            }
        });
    }
};

exports.TabTrekkerMenu = TabTrekkerMenu;
