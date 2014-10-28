'use strict';

/* SDK Modules */
const self = require('sdk/self');
const tabs = require('sdk/tabs');

/* Modules */
const logger = require('logger.js').NewTabLogger;

/* Constants */
const SETTINGS_MSG = 'settings';

/**
 * Menu module.
 */
var NewTabMenu = {

    /**
     * Attaches listeners to listen for button click events.
     */
    attachListeners: function(worker) {
        logger.log('Attaching menu listeners.');
        worker.port.on(SETTINGS_MSG, NewTabMenu.openSettings);
    },
    
    /**
     * Opens addon settings page in new tab
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

exports.NewTabMenu = NewTabMenu;
