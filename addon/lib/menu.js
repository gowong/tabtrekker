'use strict';

/* SDK Modules */
const self = require('sdk/self');
const tabs = require('sdk/tabs');

/* Modules */
const logger = require('logger.js').TabTrekkerLogger;
const images = require('images.js').TabTrekkerImages;

/* Constants */
const SETTINGS_MSG = 'menu_settings';
const NEXTIMAGE_MSG = 'menu_next_image';

/**
 * Menu module.
 */
var TabTrekkerMenu = {

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
