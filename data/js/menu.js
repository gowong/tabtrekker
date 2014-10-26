/* Constants */
const SETTINGS_MSG = 'settings';

//called on document ready
$(function() {
    //register click handlers
    $('#settings').click(Menu.clickHandler(SETTINGS_MSG));
});

/**
 * Menu module.
 */
var Menu = {

    /**
     * Handles a click event by sending a message of the event to the addon. 
     */
    clickHandler: function(message, event) {
        if(arguments.length < 2) {
            return function(event) { Menu.clickHandler(message, event) };
        }
        self.port.emit(message);
        event.stopPropagation();
        event.preventDefault();
    }
};
