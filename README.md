#TabTrekker
Explore the world one tab at a time with this Firefox addon.

##Development
1. Start Firefox with a separate dev profile using: `cfx run --profiledir=~/firefox-dev/profiles/dev`
1. Install [Extension Auto-Installer](https://addons.mozilla.org/en-US/firefox/addon/autoinstaller/).
1. (Optional) Install [Locale Switcher](https://addons.mozilla.org/en-US/firefox/addon/locale-switcher/).
1. (Optional) Install any [language packs](https://addons.mozilla.org/en-US/firefox/language-tools/) that you want to test.
1. Build and install addon using: `cfx xpi; wget --post-file=tabtrekker.xpi http://localhost:8888/;`
1. Deploy Parse API using `parse deploy TabTrekkerDev`

##Translations
[Help translate TabTrekker!](https://gowong.oneskyapp.com/collaboration/project?id=47644)
