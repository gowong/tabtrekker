'use strict';

/* Constants */
const SETTINGS_MSG = 'settings';

//called on document ready
$(function() {
    //register click handlers
    $('#settings').click(NewTabMenu.clickHandler(SETTINGS_MSG));
});

/**
 * Menu module.
 */
var NewTabMenu = {

    /**
     * Handles a click event by sending a message of the event to the addon. 
     */
    clickHandler: function(message, event) {
        if(arguments.length < 2) {
            return function(event) { NewTabMenu.clickHandler(message, event) };
        }
        self.port.emit(message);
        event.stopPropagation();
        event.preventDefault();
    }
};
