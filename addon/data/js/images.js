'use strict';

/* Constants */
//messages
const IMAGES_DISPLAY_MSG = 'images_display';

/**
 * Images module.
 */
var TabTrekkerImages = {

    /**
     * Displays the image.
     */
    displayImage: function(data) {
        var imageSrc = data.image.fileUri || data.image.imageUrl;
        if(imageSrc) {
            //set image
            var backgroundImage = 'url(' + imageSrc + ')';
            $(document.body).css('background-image', backgroundImage);

            //set image info
            $('#image_set_info').text(data.imageSetName);
            $('#image_set_info').attr('href', data.imageSetInfoUrl);
            $('#image_download').attr('href', data.image.infoUrl);
        } else {
            TabTrekkerImages.displayFallbackImage(data.fallback);
        }

        //detect errors when loading image, jquery docs say errors when loading
        //local images (file://image.png) won't be detected, but it seems to be
        //working in firefox
        $('<img>').error(function() {
            TabTrekkerImages.displayFallbackImage(data.fallback);
            $(this).remove();
        }).attr('src', imageSrc).each(function() {
            //fail-safe for cached images which sometimes don't trigger load events
            if(this.complete) {
                $(this).load();
            }
        });
    },

    /**
     * Displays the fallback image.
     */
    displayFallbackImage: function(fallback) {
        //set background image
        var fallbackImage = 'url(' + fallback + ')';
        $(document.body).css('background-image', fallbackImage);
        //hide image info
        $('#image_set_info').css('display', 'none');
        $('#image_download').css('display', 'none');
    }
};

//listen for messages
self.port.on(IMAGES_DISPLAY_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerImages.displayImage));
