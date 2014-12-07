'use strict';

/* Constants */
const SETTINGS_MSG = 'menu_settings';
const NEXTIMAGE_MSG = 'menu_next_image';

//called on document ready
$(function() {
    //register click handlers
    $('#settings').click(TabTrekkerMenu.clickHandler(SETTINGS_MSG));
    $('#next_image').click(TabTrekkerMenu.clickHandler(NEXTIMAGE_MSG));
});

/**
 * Menu module.
 */
var TabTrekkerMenu = {

    /**
     * Handles a click event by sending a message of the event to the addon. 
     */
    clickHandler: function(message, event) {
        if(arguments.length < 2) {
            return function(event) { TabTrekkerMenu.clickHandler(message, event) };
        }
        self.port.emit(message);
        event.stopPropagation();
        event.preventDefault();
    }
};
