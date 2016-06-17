# Setup globals that Firehose needs in a node environment

# Helper used to define browser globals that our node app needs
# Defines
# - window
# - document
# - location
# - $

# jQuery dependencies
jsdom = require("jsdom")
global.document = jsdom.jsdom("<html></html>")
global.window = document.defaultView

# this needs to be attached to the jsdom window object to override
# jsdom's internal xmlhttprequest object
window.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest

# Set a location so that URIjs behaves correctly
jsdom.changeURL(window, "http://localhost:8080")

# require("jquery") onnly loads the library.
# You need to initialize it with a Window object
global.$ = require("jquery")
$(window)

# Node environments need this, browsers implement it themselves
global.WebSocket = require("ws")
