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
        //set image
        var background = $(document.body);
        var imageSrc = image.fileUri || image.imageUrl;
        var imageFallback = image.fallback;
        var backgroundImage = 'url(' + imageSrc + '), url(' + imageFallback + ')';
        background.css('background-image', backgroundImage);

        //set image info
        var imageSetName = image.imageSetName;
        var imageSetLink = image.imageSetInfoUrl;
        var imageDownloadLink = image.infoUrl;
        $('#image_set_info').text(imageSetName);
        $('#image_set_info').attr('href', imageSetLink);
        $('#image_download').attr('href', imageDownloadLink);
    }
};

//listen for messages
self.port.on(IMAGES_DISPLAY_MSG, NewTabUtils.receiveMessage(NewTabImages.displayImage));
