/* SDK Modules */
const self = require("sdk/self");
const tabs = require('sdk/tabs');

/* Constants */
const SETTINGS_MSG = 'settings';

/**
 * Attaches listeners to listen for button click events.
 */
exports.attachListeners = function(worker) {
    worker.port.on(SETTINGS_MSG, openSettings);
}

/**
 * Opens addon settings page in new tab
 */
function openSettings() {
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
