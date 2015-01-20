#TabTrekker
Explore the world one tab at a time with this Firefox addon.

##Development
1. Start Firefox with a separate dev profile using: `cfx run --profiledir=~/firefox-dev/profiles/dev`
2. Install [Extension Auto-Installer](https://addons.mozilla.org/en-US/firefox/addon/autoinstaller/)
3. Install [Locale Switcher](https://addons.mozilla.org/en-US/firefox/addon/locale-switcher/)
4. Install [Simple Storage Editor](https://addons.mozilla.org/en-US/firefox/addon/simple-storage-editor-for-a/)
5. Install any [language packs](https://addons.mozilla.org/en-US/firefox/language-tools/) that you want to test. 
6. Build and install addon using: `cfx xpi; wget --post-file=tabtrekker.xpi http://localhost:8888/;`
