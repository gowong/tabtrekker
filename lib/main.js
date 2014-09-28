var prefs = require('sdk/simple-prefs');
var buttons = require('sdk/ui/button/action');
var tabs = require('sdk/tabs');

function onEnabled() {
    console.log(prefs['enabled']);
}

//listen to preference changes
prefs.on('enabled', onEnabled);

var button = buttons.ActionButton({
  id: "mozilla-link",
  label: "Visit Mozilla",
  icon: {
    "16": "./icon-16.png",
    "32": "./icon-32.png",
    "64": "./icon-64.png"
  },
  onClick: handleClick
});

function handleClick(state) {
  tabs.open("http://www.developer.mozilla.org/");
}
