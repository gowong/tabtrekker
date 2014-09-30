/* Constants */
const SETTINGS_MSG = 'settings';

//called on document ready
$(function() {
    //register click handlers
    $('#top_menu_settings').click(clickHandler(SETTINGS_MSG));
});

/**
 * Handles a click event by sending a message of the event to the addon. 
 */
function clickHandler(message, event) {
    if(arguments.length < 2) {
        return function(event) { clickHandler(message, event) };
    }
    self.port.emit(message);
    event.stopPropagation();
    event.preventDefault();
}
