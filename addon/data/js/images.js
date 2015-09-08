'use strict';

/* Constants */
//messages
const IMAGES_DISPLAY_MSG = 'images_display';
//preferences
const SHOW_IMAGE_INFO_PREF = 'show_image_info';

/**
 * Images module.
 */
var TabTrekkerImages = {

    /**
     * Displays the image.
     */
    displayImage: function(data) {
        var localImage = data.image.resourceUri || data.image.fileUri;
        var remoteImage = data.image.imageUrl;

        //local image
        TabTrekkerImages.setImageBackground(localImage, data, function() {

            //remote image
            TabTrekkerImages.setImageBackground(remoteImage, data, function() {
                TabTrekkerImages.displayFallbackImage(data.fallback);
            });
        });
    },

    /**
     * Tries to load and set the background image.
     * Callback is called if the image fails to load.
     */
    setImageBackground: function(imageSrc, data, callback) {

        if(!imageSrc) {
            callback();
            return;
        }

        //detect errors when loading image, jquery docs say errors when loading
        //local images (file://image.png) might not be detected, but it seems
        //to be working in firefox
        $(document.createElement('img')).on('load', function() {

            $(this).remove();

            //check that the image was actually loaded
            if(!this.complete || (this.naturalWidth === 0)) {
                callback();
                return;
            }

            //set background image
            var backgroundImage = 'url(' + imageSrc + ')';
            $(document.body).css('background-image', backgroundImage);

            //set image info
            $('#image_set_info').text(data.imageSetName);
            $('#image_set_info').attr('href', data.imageSetInfoUrl);
            $('#image_download').attr('href', data.image.infoUrl);

            //set image info visibility
            TabTrekkerImages.setImageInfoVisibility(data[SHOW_IMAGE_INFO_PREF]);

        }).on('error', function() {
            callback();
            $(this).remove();
        }).attr('src', imageSrc).each(function() {
            //fail-safe for cached images which sometimes don't trigger load events
            if(this.complete) {
                $(this).load();
            }
        });
    },

    /**
     * Sets visibility of the image info based on user preferences.
     */
    setImageInfoVisibility: function(visbilityPref) {
        switch(visbilityPref) {
            case 'always':
                $('#image_info_container').css('display', 'block');
                $('#image_info_container').css('opacity', 1);
                break;
            case 'hover':
                $('#image_info_container').css('display', 'block');
                break;
            case 'never':
                $('#image_info_container').css('display', 'none');
                break;
        }
    },

    /**
     * Displays the fallback image.
     */
    displayFallbackImage: function(fallback) {
        //set background image
        var fallbackImage = 'url(' + fallback + ')';
        $(document.body).css('background-image', fallbackImage);
        //hide image info
        TabTrekkerImages.setImageInfoVisibility('never');
    }
};

//listen for messages
self.port.on(IMAGES_DISPLAY_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerImages.displayImage));
