'use strict';

/* Constants */
//messages
const HIDE_MENU_MSG = 'hide_menu';
const MENU_MSG = 'menu';
const NEXTIMAGE_MSG = 'menu_next_image';
const SETTINGS_MSG = 'menu_settings';
//preferences
const SHOW_MENU_PREF = 'show_menu';
//other
const DROPDOWN_TRANSITION = 200;

//called on document ready
$(function() {
    //register click handlers
    $('#settings').click(function(event) {
        TabTrekkerMenu.handleClick(SETTINGS_MSG, event);
    });
    $('#next_image').click(function(event) {
        if(TabTrekkerImages.shouldShowNextImage()) {
            TabTrekkerMenu.handleClick(NEXTIMAGE_MSG, event);
        }
    });
    //dropdown animation
    $('.dropdown').on('show.bs.dropdown hide.bs.dropdown', function(event) {
        $(this).find('.dropdown-menu').first().stop(true, true)
            .fadeToggle(DROPDOWN_TRANSITION);
    });
});

/**
 * Menu module.
 */
var TabTrekkerMenu = {

    initMenu: function(data) {
        if(!data) {
            return;
        }
        TabTrekkerMenu.setMenuVisibility(data[SHOW_MENU_PREF]);
    },

    /**
     * Handles a click event by sending a message of the event to the addon. 
     */
    handleClick: function(message, event) {
        self.port.emit(message);
        event.stopPropagation();
        event.preventDefault();
    },

    /**
     * Sets visibility of the menu based on user preferences.
     */
    setMenuVisibility: function(visbilityPref) {
        switch(visbilityPref) {
            case 'always':
                $('#top_menu_container').css('display', 'block');
                $('#top_menu_container .hover_item').css('opacity', 1);
                break;
            case 'hover':
                $('#top_menu_container').css('display', 'block');
                break;
            case 'never':
                TabTrekkerMenu.hideMenu();
                break;
        }
    },

    /**
     * Hides the menu.
     */
    hideMenu: function() {
        $('#top_menu_container').css('display', 'none');
    }
};

//listen for messages
self.port.on(HIDE_MENU_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerMenu.hideMenu));
self.port.on(MENU_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerMenu.initMenu));
