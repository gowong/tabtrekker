'use strict';

/* Constants */
//messages
const IMAGES_DISPLAY_MSG = 'images_display';

/**
 * Images module.
 */
var NewTabImages = {

    /**
     * Displays the image.
     */
    displayImage: function(image) {
        var background = $(document.body);
        var imageSrc = image.fileUri || image.imageUrl;
        var imageFallback = image.fallback;
        var backgroundImage = 'url(' + imageSrc + '), url(' + imageFallback + ')';
        background.css('background-image', backgroundImage);
    }
};

//listen for messages
self.port.on(IMAGES_DISPLAY_MSG, NewTabUtils.receiveMessage(NewTabImages.displayImage));
