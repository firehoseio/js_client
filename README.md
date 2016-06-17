      __ _          _
     / _(_)        | |
    | |_ _ _ __ ___| |__   ___  ___  ___
    |  _| | '__/ _ \ '_ \ / _ \/ __|/ _ \
    | | | | | |  __/ | | | (_) \__ \  __/
    |_| |_|_|  \___|_| |_|\___/|___/\___|

    Javascript client

[![Build Status](https://travis-ci.org/firehoseio/js_client.png)](https://travis-ci.org/firehoseio/js_client) [![Code Climate](https://codeclimate.com/github/firehoseio/js_client/badges/gpa.svg)](https://codeclimate.com/github/firehoseio/js_client) [![Test Coverage](https://codeclimate.com/github/firehoseio/js_client/badges/coverage.svg)](https://codeclimate.com/github/firehoseio/js_client/coverage)

# What is Firehose?

Firehose is both a Rack application and JavaScript library that makes building real-time web applications possible.

# Usage

Firehose depends on jQuery, which must be available in the global scope (window.jQuery or global.jQuery).

## Script

Load `dist/firehose.js` via a script tag. Then access Firehose via `window.Firehose`.

## Webpack/Browserify

```
global.jQuery = require("jquery")
Firehose = require("firehose-client")
```

## Node

As this is a browser client, it involes slightly more work top get it running in Node.
A window and document must be available along with jQuery, WebSocket and XMLHttpRequest.

A helper to set this up is provided at `helpers/node.js`  which depends on `jsdom`,
`jquery`, `ws` and `xmlhttprequest` being available as node modules.

```
$ npm install firehose-client jsdom@9.2 jquery@2.2 ws@1.1 xmlhttprequest@1.8 --save
$ node
> Firehose = require("./node_modules/firehose-client/helpers/node.js")
```

# The JavaScript Consumer

```javascript

new Firehose.Consumer({
  message: function(msg){
    console.log(msg);
  },
  connected: function(){
    console.log("Great Scotts!! We're connected!");
  },
  disconnected: function(){
    console.log("Well shucks, we're not connected anymore");
  },
  error: function(){
    console.log("Well then, something went horribly wrong.");
  },
  // Note that we do NOT specify a protocol here because we don't
  // know that yet.
  uri: '//localhost:7474/hello'
}).connect();
```

There's also a Consumer that uses channel multiplexing.
The multiplexed consumer is useful for scenarios where you want to subscribe
to messages from many channels at once, without having to use one connection
per channel. You can specify a list of channels to subscribe to, including a
handler function per channel that gets called with all messages coming from that
channel.

Example:

```javascript
new Firehose.MultiplexedConsumer({
  connected: function(){
    console.log("Great Scotts!! We're connected!");
  },
  disconnected: function(){
    console.log("Well shucks, we're not connected anymore");
  },
  error: function(){
    console.log("Well then, something went horribly wrong.");
  },
  // Note that we don't specify a general message handler function
  // but instead define one per channel below

  // Note that we do NOT specify a protocol here because we don't
  // know that yet. We also don't specify a specific channel name as part of
  // the URI but instead pass in a list of subscriptions below
  uri: '//localhost:7474/',

  // List of channel subscriptions:
  channels: {
    "/my/channel/1": {
      last_sequence: 10,        // defaults to 0 and can be ommitted
      message: function(msg) {
        console.log("got message on channel 1:");
        console.log(msg);
      }
    },
    "/my/channel/2": {
      message: function(msg) {
        console.log("got message on channel 2:");
        console.log(msg);
      }
    }
  }
}).connect();
```

Then publish another message.

```sh
$ curl -X PUT -d "\"This is almost magical\"" "http://localhost:7474/hello"
```
