'use strict';

/* Constants */
//messages
const IMAGES_DISPLAY_MSG = 'images_display';
//preferences
const SHOW_IMAGE_INFO_PREF = 'show_image_info';
//other
const IMAGE_LOADED_CLASS = 'image_loaded';
const HIDE_IMAGE_DELAY = 300;
const DISPLAY_IMAGE_TRANSITION = 500;

/**
 * Images module.
 */
var TabTrekkerImages = {

    displayImageTimer: null,

    /**
     * Receives the image data.
     */
    receiveImageData: function(data) {
        if(TabTrekkerImages.isImageDisplayed()) {
            TabTrekkerImages.hideImage();
            //wait a bit for the hide image transition before displaying the
            //new image
            TabTrekkerImages.displayImageTimer = setTimeout(function() {
                TabTrekkerImages.loadAndDisplayImage(data);
            }, HIDE_IMAGE_DELAY);
        } else {
            TabTrekkerImages.loadAndDisplayImage(data);
        }
    },

    /**
     * Tries to load and display the image, automatically falling back
     * to backup images if needed.
     */
    loadAndDisplayImage: function(data) {
        var localImage = data.image.resourceUri || data.image.fileUri;
        var remoteImage = data.image.imageUrl;

        //local image
        TabTrekkerImages.displayImage(localImage, data, function() {

            //remote image
            TabTrekkerImages.displayImage(remoteImage, data, function() {
                TabTrekkerImages.displayFallbackImage(data.fallback);
            });
        });
    },

    /**
     * Tries to load and display the image.
     * Callback is called if the image fails to load.
     */
    displayImage: function(imageSrc, data, callback) {

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
            TabTrekkerImages.setBackgroundImage(imageSrc);

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
     * Displays the fallback image.
     */
    displayFallbackImage: function(fallbackImage) {
        TabTrekkerImages.setBackgroundImage(fallbackImage);
        TabTrekkerImages.setImageInfoVisibility('never');
    },

    /**
     * Sets the background image.
     */
    setBackgroundImage: function(imageSrc) {
        var backgroundImage = $('#background_image');
        backgroundImage.css('background-image', 'url(' + imageSrc + ')');
        backgroundImage.css('opacity', 1);
        //wait until the display image transition is done before removing
        //the timer
        setTimeout(function() {
            TabTrekkerImages.displayImageTimer = null;
        }, DISPLAY_IMAGE_TRANSITION);
    },

    /**
     * Hides the image.
     */
    hideImage: function() {
        $(document.body).addClass(IMAGE_LOADED_CLASS);
        $('#background_image').css('opacity', 0);
    },

    /**
     * Returns true whether there is an image displayed.
     */
    isImageDisplayed: function() {
        return $('#background_image').css('opacity') === '1';
    },

    /**
     * Returns true if the next image should be shown.
     */
    shouldShowNextImage: function() {
        //if there is a display image in progress
        return !TabTrekkerImages.displayImageTimer;
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
    }
};

//listen for messages
self.port.on(IMAGES_DISPLAY_MSG, TabTrekkerUtils.receiveMessage(TabTrekkerImages.receiveImageData));
