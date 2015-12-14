#TabTrekker
[![Codacy Badge](https://api.codacy.com/project/badge/grade/558c8d1d8ddc419fa5fa501558288155)](https://www.codacy.com/app/gowong/tabtrekker)

Explore the world one tab at a time.
TabTrekker is a Firefox addon that replaces the new tab page.

##Development
1. Start Firefox with a separate dev profile using: `cfx run --profiledir=~/firefox-dev/profiles/dev`
1. Install [Extension Auto-Installer](https://addons.mozilla.org/en-US/firefox/addon/autoinstaller/).
1. (Optional) Install [Locale Switcher](https://addons.mozilla.org/en-US/firefox/addon/locale-switcher/).
1. (Optional) Install any [language packs](https://addons.mozilla.org/en-US/firefox/language-tools/) that you want to test.
1. Build and install addon using: `cfx xpi; wget --post-file=tabtrekker.xpi http://localhost:8888/;`
1. Deploy Parse API using `parse deploy TabTrekkerDev`

##Translations
[Help translate TabTrekker!](https://gowong.oneskyapp.com/collaboration/project?id=47644)
