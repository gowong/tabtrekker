'use strict';

/**
 * Configurations module.
 */
var NewTabConfig = {

    dev: true,

    parseDev: {
        appId: 'ljUR1d7dsOLJmWniAszRSCS1jl2PTUpbyyC3WBUZ',
        restApiKey: 'P1E87oyMnnsj9KZPc8OB7hjqqaI80j2936YlthD8',
    },

    parseProd: {
        appId: 'A4zgYNwtfhU6XySHowIXJlAkxajxl2qDBDZi6SU6',
        restApiKey: 'tNKNYALwg66YZrec2fhzeK8aBQoJ5UZw21hmtLvm'
    },

    getParseAppId: function() {
        return NewTabConfig.dev ? NewTabConfig.parseDev.appId
            : NewTabConfig.parseProd.appId;
    },

    getParseRestApiKey: function() {
        return NewTabConfig.dev ? NewTabConfig.parseDev.restApiKey
            : NewTabConfig.parseProd.restApiKey;
    }
};

exports.NewTabConfig = NewTabConfig;
