#TabTrekker
Explore the world one tab at a time with this Firefox addon.

##Development
1. Start Firefox with a separate dev profile using: `cfx run --profiledir=~/firefox-dev/profiles/dev`
2. Install [Extension Auto-Installer](https://addons.mozilla.org/en-US/firefox/addon/autoinstaller/).
3. Install [Locale Switcher](https://addons.mozilla.org/en-US/firefox/addon/locale-switcher/).
4. Install any [language packs](https://addons.mozilla.org/en-US/firefox/language-tools/) that you want to test.
5. Build and install addon using: `cfx xpi; wget --post-file=tabtrekker.xpi http://localhost:8888/;`
6. Update Parse using `parse deploy TabTrekkerDev`

##Translations
[Help translate TabTrekker!](https://gowong.oneskyapp.com/collaboration/project?id=47644)

##Compatibility
TabTrekker has been confirmed to work on Firefox 31.0 - 43.0a2
