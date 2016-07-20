webpackJsonp([0],[
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	window.$ = window.jQuery = __webpack_require__(1);
	
	$(window);
	
	window.Firehose = __webpack_require__(2);


/***/ },
/* 1 */,
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var __VERSION__ = null;
	
	if (false) {
	  require("coffee-script/register");
	  __VERSION__ = require("../helpers/node").version
	}
	
	exports = module.exports = __webpack_require__(3);
	exports.version = __VERSION__;


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
	  version: __webpack_require__(4).version,
	  codeName: __webpack_require__(4).codeName,
	  Consumer: __webpack_require__(5),
	  LongPollTransport: __webpack_require__(8),
	  MultiplexedConsumer: __webpack_require__(9),
	  MultiplexedLongPoll: __webpack_require__(11),
	  Transport: __webpack_require__(7),
	  WebSocketTransport: __webpack_require__(6),
	  MultiplexedWebSocket: __webpack_require__(10)
	};


/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = {
		"name": "firehose-client",
		"version": "1.0.3",
		"codeName": "Jingle All the Way",
		"main": "lib/index.js",
		"scripts": {
			"build": "webpack -p",
			"build:watch": "webpack --watch",
			"test": "JASMINE_CONFIG_PATH=./spec/javascripts/support/jasmine.json jasmine"
		},
		"devDependencies": {
			"clean-webpack-plugin": "^0.1.9",
			"codo": "git://github.com/coffeedoc/codo.git",
			"coffee-loader": "^0.7.2",
			"coffeelint": "^1.14.0",
			"coffeelint-function-call-whitespace": "^0.1.3",
			"coffeelint-prefer-double-quotes": "^0.1.0",
			"coffeelint-prefer-symbol-operator": "^0.1.1",
			"jasmine": "^2.4.1",
			"json-loader": "^0.5.4",
			"sinon": "^1.17.4",
			"webpack": "^1.13.1"
		},
		"dependencies": {
			"coffee-script": "^1.10.0",
			"jquery": "^2.2.4",
			"jsdom": "^9.2.1",
			"ws": "^1.1.0",
			"xmlhttprequest": "^1.8.0"
		},
		"repository": {
			"type": "git",
			"url": "git://github.com/firehoseio/js_client.git"
		}
	};

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var Consumer, LongPollTransport, WebSocketTransport,
	  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
	
	WebSocketTransport = __webpack_require__(6);
	
	LongPollTransport = __webpack_require__(8);
	
	Consumer = (function() {
	  function Consumer(config1) {
	    var base, base1, base2, base3, base4, base5, base6, base7, origConnected;
	    this.config = config1 != null ? config1 : {};
	    this._connectPromise = bind(this._connectPromise, this);
	    this._upgradeTransport = bind(this._upgradeTransport, this);
	    this.stop = bind(this.stop, this);
	    this.connect = bind(this.connect, this);
	    this.longpollTransport = bind(this.longpollTransport, this);
	    this.websocketTransport = bind(this.websocketTransport, this);
	    this.connected = bind(this.connected, this);
	    (base = this.config).message || (base.message = function() {});
	    (base1 = this.config).error || (base1.error = function() {});
	    (base2 = this.config).connected || (base2.connected = function() {});
	    (base3 = this.config).disconnected || (base3.disconnected = function() {});
	    (base4 = this.config).failed || (base4.failed = function() {
	      throw "Could not connect";
	    });
	    (base5 = this.config).subscriptionFailed || (base5.subscriptionFailed = function() {});
	    (base6 = this.config).params || (base6.params = {});
	    (base7 = this.config).parse || (base7.parse = JSON.parse);
	    this._isConnected = false;
	    origConnected = this.config.connected;
	    this.config.connected = (function(_this) {
	      return function() {
	        _this._isConnected = true;
	        return origConnected();
	      };
	    })(this);
	    this;
	  }
	
	  Consumer.prototype.connected = function() {
	    return this._isConnected;
	  };
	
	  Consumer.prototype.websocketTransport = function(config) {
	    return new WebSocketTransport(config);
	  };
	
	  Consumer.prototype.longpollTransport = function(config) {
	    return new LongPollTransport(config);
	  };
	
	  Consumer.prototype.connect = function(delay) {
	    var promise;
	    if (delay == null) {
	      delay = 0;
	    }
	    promise = this._connectPromise();
	    this.config.connectionVerified = this._upgradeTransport;
	    if (WebSocketTransport.supported()) {
	      this.upgradeTimeout = setTimeout((function(_this) {
	        return function() {
	          var ws;
	          ws = _this.websocketTransport(_this.config);
	          return ws.connect(delay);
	        };
	      })(this), 500);
	    }
	    this.transport = this.longpollTransport(this.config);
	    this.transport.connect(delay);
	    return promise;
	  };
	
	  Consumer.prototype.stop = function() {
	    if (this.upgradeTimeout != null) {
	      clearTimeout(this.upgradeTimeout);
	      this.upgradeTimeout = null;
	    }
	    this.transport.stop();
	  };
	
	  Consumer.prototype._upgradeTransport = function(ws) {
	    this.transport.stop();
	    ws.sendStartingMessageSequence(this.transport.getLastMessageSequence());
	    this.transport = ws;
	  };
	
	  Consumer.prototype._connectPromise = function() {
	    var deferred, origConnected;
	    deferred = $.Deferred();
	    origConnected = this.config.connected;
	    this.config.connected = (function(_this) {
	      return function() {
	        deferred.resolve();
	        if (origConnected) {
	          _this.config.connected = origConnected;
	          return origConnected();
	        }
	      };
	    })(this);
	    return deferred.promise();
	  };
	
	  return Consumer;
	
	})();
	
	Consumer.multiplexChannel = "channels@firehose";
	
	module.exports = Consumer;


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {var INITIAL_PING_TIMEOUT, KEEPALIVE_PING_TIMEOUT, Transport, WebSocketTransport, getWebSocket, sendPing,
	  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty;
	
	Transport = __webpack_require__(7);
	
	INITIAL_PING_TIMEOUT = 2000;
	
	KEEPALIVE_PING_TIMEOUT = 20000;
	
	sendPing = function(socket) {
	  return socket.send(JSON.stringify({
	    ping: 'PING'
	  }));
	};
	
	getWebSocket = function() {
	  return (typeof window !== "undefined" && window !== null ? window.WebSocket : void 0) || (typeof global !== "undefined" && global !== null ? global.WebSocket : void 0);
	};
	
	WebSocketTransport = (function(superClass) {
	  extend(WebSocketTransport, superClass);
	
	  WebSocketTransport.prototype.name = function() {
	    return 'WebSocket';
	  };
	
	  WebSocketTransport.ieSupported = function() {
	    return (document.documentMode || 10) > 9;
	  };
	
	  WebSocketTransport.supported = function() {
	    return !!getWebSocket();
	  };
	
	  function WebSocketTransport(args) {
	    this._clearKeepalive = bind(this._clearKeepalive, this);
	    this._restartKeepAlive = bind(this._restartKeepAlive, this);
	    this._cleanUp = bind(this._cleanUp, this);
	    this._error = bind(this._error, this);
	    this._close = bind(this._close, this);
	    this._message = bind(this._message, this);
	    this.stop = bind(this.stop, this);
	    this.sendStartingMessageSequence = bind(this.sendStartingMessageSequence, this);
	    this._lookForInitialPong = bind(this._lookForInitialPong, this);
	    this._open = bind(this._open, this);
	    this._requestParams = bind(this._requestParams, this);
	    this._protocol = bind(this._protocol, this);
	    this._request = bind(this._request, this);
	    this._sendMessage = bind(this._sendMessage, this);
	    var base;
	    WebSocketTransport.__super__.constructor.call(this, args);
	    (base = this.config).webSocket || (base.webSocket = {});
	    this.config.webSocket.connectionVerified = this.config.connectionVerified;
	  }
	
	  WebSocketTransport.prototype._sendMessage = function(message) {
	    var ref;
	    return (ref = this.socket) != null ? ref.send(JSON.stringify(message)) : void 0;
	  };
	
	  WebSocketTransport.prototype._request = function() {
	    var err, error, ws;
	    try {
	      ws = getWebSocket();
	      this.socket = new ws((this._protocol()) + ":" + this.config.uri + "?" + ($.param(this._requestParams())));
	      this.socket.onopen = this._open;
	      this.socket.onclose = this._close;
	      this.socket.onerror = this._error;
	      return this.socket.onmessage = this._lookForInitialPong;
	    } catch (error) {
	      err = error;
	      return typeof console !== "undefined" && console !== null ? console.log(err) : void 0;
	    }
	  };
	
	  WebSocketTransport.prototype._protocol = function() {
	    if (this.config.ssl) {
	      return "wss";
	    } else {
	      return "ws";
	    }
	  };
	
	  WebSocketTransport.prototype._requestParams = function() {
	    return this.config.params;
	  };
	
	  WebSocketTransport.prototype._open = function() {
	    return sendPing(this.socket);
	  };
	
	  WebSocketTransport.prototype._lookForInitialPong = function(event) {
	    var e;
	    this._restartKeepAlive();
	    if (this._isPong((function() {
	      var error;
	      try {
	        return JSON.parse(event.data);
	      } catch (error) {
	        e = error;
	        return {};
	      }
	    })())) {
	      if (this._lastMessageSequence != null) {
	        return this.sendStartingMessageSequence(this._lastMessageSequence);
	      } else {
	        return this.config.webSocket.connectionVerified(this);
	      }
	    }
	  };
	
	  WebSocketTransport.prototype.sendStartingMessageSequence = function(message_sequence) {
	    this._lastMessageSequence = message_sequence;
	    this.socket.onmessage = this._message;
	    this._sendMessage({
	      message_sequence: message_sequence
	    });
	    this._needToNotifyOfDisconnect = true;
	    return Transport.prototype._open.call(this);
	  };
	
	  WebSocketTransport.prototype.stop = function() {
	    return this._cleanUp();
	  };
	
	  WebSocketTransport.prototype._message = function(event) {
	    var e, error, frame;
	    frame = this.config.parse(event.data);
	    this._restartKeepAlive();
	    if (this._isSubscriptionFailed(frame)) {
	      return this.config.subscriptionFailed(frame);
	    }
	    if (!this._isPong(frame)) {
	      try {
	        this._lastMessageSequence = frame.last_sequence;
	        return this.config.message(this.config.parse(frame.message));
	      } catch (error) {
	        e = error;
	      }
	    }
	  };
	
	  WebSocketTransport.prototype._close = function(event) {
	    if (event != null ? event.wasClean : void 0) {
	      return this._cleanUp();
	    } else {
	      return this._error(event);
	    }
	  };
	
	  WebSocketTransport.prototype._error = function(event) {
	    this._cleanUp();
	    if (this._needToNotifyOfDisconnect) {
	      this._needToNotifyOfDisconnect = false;
	      this.config.disconnected();
	    }
	    if (this._succeeded) {
	      return this.connect(this._retryDelay);
	    } else if (this.config.failed) {
	      return this.config.failed(this);
	    }
	  };
	
	  WebSocketTransport.prototype._cleanUp = function() {
	    this._clearKeepalive();
	    if (this.socket != null) {
	      this.socket.onopen = null;
	      this.socket.onclose = null;
	      this.socket.onerror = null;
	      this.socket.onmessage = null;
	      return this.socket.close();
	    }
	  };
	
	  WebSocketTransport.prototype._restartKeepAlive = function() {
	    var doPing, setNextKeepAlive;
	    doPing = (function(_this) {
	      return function() {
	        sendPing(_this.socket);
	        return setNextKeepAlive();
	      };
	    })(this);
	    setNextKeepAlive = (function(_this) {
	      return function() {
	        return _this.keepaliveTimeout = setTimeout(doPing, KEEPALIVE_PING_TIMEOUT);
	      };
	    })(this);
	    this._clearKeepalive();
	    return setNextKeepAlive();
	  };
	
	  WebSocketTransport.prototype._clearKeepalive = function() {
	    if (this.keepaliveTimeout != null) {
	      clearTimeout(this.keepaliveTimeout);
	      return this.keepaliveTimeout = null;
	    }
	  };
	
	  WebSocketTransport.prototype._isPong = function(o) {
	    return o.pong === 'PONG';
	  };
	
	  WebSocketTransport.prototype._isSubscriptionFailed = function(o) {
	    return o.error === 'Subscription Failed';
	  };
	
	  return WebSocketTransport;
	
	})(Transport);
	
	module.exports = WebSocketTransport;
	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 7 */
/***/ function(module, exports) {

	var Transport,
	  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
	
	Transport = (function() {
	  Transport.supported = function() {
	    return false;
	  };
	
	  function Transport(config) {
	    var base;
	    if (config == null) {
	      config = {};
	    }
	    this.getLastMessageSequence = bind(this.getLastMessageSequence, this);
	    this._close = bind(this._close, this);
	    this._open = bind(this._open, this);
	    this._error = bind(this._error, this);
	    this.connect = bind(this.connect, this);
	    this.config = config;
	    (base = this.config).params || (base.params = {});
	    this._retryDelay = 3000;
	    this;
	  }
	
	  Transport.prototype.connect = function(delay) {
	    if (delay == null) {
	      delay = 0;
	    }
	    setTimeout(this._request, delay);
	    return this;
	  };
	
	  Transport.prototype.name = function() {
	    throw 'not implemented in base Transport';
	  };
	
	  Transport.prototype.stop = function() {
	    throw 'not implemented in base Transport';
	  };
	
	  Transport.prototype._request = function() {
	    throw 'not implemented in base Transport';
	  };
	
	  Transport.prototype._error = function(event) {
	    if (this._succeeded) {
	      this.config.disconnected();
	      return this.connect(this._retryDelay);
	    } else {
	      return this.config.failed(this);
	    }
	  };
	
	  Transport.prototype._open = function(event) {
	    this._succeeded = true;
	    return this.config.connected(this);
	  };
	
	  Transport.prototype._close = function(event) {
	    return this.config.disconnected();
	  };
	
	  Transport.prototype.getLastMessageSequence = function() {
	    return this._lastMessageSequence || 0;
	  };
	
	  return Transport;
	
	})();
	
	module.exports = Transport;


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	var LongPollTransport, Transport,
	  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty;
	
	Transport = __webpack_require__(7);
	
	LongPollTransport = (function(superClass) {
	  extend(LongPollTransport, superClass);
	
	  LongPollTransport.prototype.messageSequenceHeader = 'Pragma';
	
	  LongPollTransport.prototype.name = function() {
	    return 'LongPoll';
	  };
	
	  LongPollTransport.ieSupported = function() {
	    return (document.documentMode || 10) >= 8;
	  };
	
	  LongPollTransport.supported = function() {
	    var xhr;
	    if (xhr = $.ajaxSettings.xhr()) {
	      return "withCredentials" in xhr || LongPollTransport.ieSupported();
	    }
	  };
	
	  function LongPollTransport(args) {
	    this._error = bind(this._error, this);
	    this._ping = bind(this._ping, this);
	    this._success = bind(this._success, this);
	    this.stop = bind(this.stop, this);
	    this._requestParams = bind(this._requestParams, this);
	    this._request = bind(this._request, this);
	    this._protocol = bind(this._protocol, this);
	    var base, base1, base2, base3;
	    LongPollTransport.__super__.constructor.call(this, args);
	    if ((base = this.config).ssl == null) {
	      base.ssl = false;
	    }
	    (base1 = this.config).longPoll || (base1.longPoll = {});
	    (base2 = this.config.longPoll).url || (base2.url = (this._protocol()) + ":" + this.config.uri);
	    (base3 = this.config.longPoll).timeout || (base3.timeout = 25000);
	    this._lagTime = 5000;
	    this._timeout = this.config.longPoll.timeout + this._lagTime;
	    this._okInterval = this.config.okInterval || 0;
	    this._stopRequestLoop = false;
	    this._lastMessageSequence = 0;
	  }
	
	  LongPollTransport.prototype._protocol = function() {
	    if (this.config.ssl) {
	      return "https";
	    } else {
	      return "http";
	    }
	  };
	
	  LongPollTransport.prototype._request = function() {
	    var data;
	    if (this._stopRequestLoop) {
	      return;
	    }
	    data = this._requestParams();
	    data.last_message_sequence = this._lastMessageSequence;
	    return this._lastRequest = $.ajax({
	      url: this.config.longPoll.url,
	      firehose: true,
	      crossDomain: true,
	      data: data,
	      timeout: this._timeout,
	      success: this._success,
	      error: this._error,
	      cache: false
	    });
	  };
	
	  LongPollTransport.prototype._requestParams = function() {
	    return this.config.params;
	  };
	
	  LongPollTransport.prototype.stop = function() {
	    var e, error1, error2;
	    this._stopRequestLoop = true;
	    if (this._lastRequest != null) {
	      try {
	        this._lastRequest.abort();
	      } catch (error1) {
	        e = error1;
	      }
	      delete this._lastRequest;
	    }
	    if (this._lastPingRequest != null) {
	      try {
	        this._lastPingRequest.abort();
	      } catch (error2) {
	        e = error2;
	      }
	      return delete this._lastPingRequest;
	    }
	  };
	
	  LongPollTransport.prototype._success = function(data, status, jqXhr) {
	    var e, error1, last_sequence, message, ref;
	    if (this._needToNotifyOfReconnect || !this._succeeded) {
	      this._needToNotifyOfReconnect = false;
	      this._open(data);
	    }
	    if (this._stopRequestLoop) {
	      return;
	    }
	    if (jqXhr.status === 200) {
	      try {
	        ref = JSON.parse(jqXhr.responseText), message = ref.message, last_sequence = ref.last_sequence;
	        this._lastMessageSequence = last_sequence || 0;
	        this.config.message(this.config.parse(message));
	      } catch (error1) {
	        e = error1;
	      }
	    }
	    return this.connect(this._okInterval);
	  };
	
	  LongPollTransport.prototype._ping = function() {
	    return this._lastPingRequest = $.ajax({
	      url: this.config.uri,
	      method: 'HEAD',
	      crossDomain: true,
	      firehose: true,
	      data: this._requestParams(),
	      success: (function(_this) {
	        return function() {
	          if (_this._needToNotifyOfReconnect) {
	            _this._needToNotifyOfReconnect = false;
	            return _this.config.connected(_this);
	          }
	        };
	      })(this)
	    });
	  };
	
	  LongPollTransport.prototype._error = function(jqXhr, status, error) {
	    if (jqXhr.status === 500) {
	      error = JSON.parse(jqXhr.responseText);
	      if (error.error === 'Subscription failed') {
	        this.config.subscriptionFailed(error);
	      }
	    }
	    if (!(this._needToNotifyOfReconnect || this._stopRequestLoop)) {
	      this._needToNotifyOfReconnect = true;
	      this.config.disconnected();
	    }
	    if (!this._stopRequestLoop) {
	      setTimeout(this._ping, this._retryDelay + this._lagTime);
	      return setTimeout(this._request, this._retryDelay);
	    }
	  };
	
	  return LongPollTransport;
	
	})(Transport);
	
	module.exports = LongPollTransport;


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	var Consumer, MultiplexedConsumer, MultiplexedLongPoll, MultiplexedWebSocket,
	  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty,
	  slice = [].slice;
	
	Consumer = __webpack_require__(5);
	
	MultiplexedWebSocket = __webpack_require__(10);
	
	MultiplexedLongPoll = __webpack_require__(11);
	
	MultiplexedConsumer = (function(superClass) {
	  extend(MultiplexedConsumer, superClass);
	
	  MultiplexedConsumer.subscriptionQuery = function(config) {
	    var channel, opts;
	    return {
	      subscribe: [
	        (function() {
	          var ref, results;
	          ref = config.channels;
	          results = [];
	          for (channel in ref) {
	            opts = ref[channel];
	            results.push(channel + "!" + (opts.last_sequence || 0));
	          }
	          return results;
	        })()
	      ].join(",")
	    };
	  };
	
	  MultiplexedConsumer.normalizeChannels = function(config) {
	    var chan, opts, ref, results;
	    ref = config.channels;
	    results = [];
	    for (chan in ref) {
	      opts = ref[chan];
	      if (chan[0] !== "/") {
	        delete config.channels[chan];
	        results.push(config.channels["/" + chan] = opts);
	      } else {
	        results.push(void 0);
	      }
	    }
	    return results;
	  };
	
	  MultiplexedConsumer.normalizeChannel = function(channel) {
	    if (channel[0] !== "/") {
	      return "/" + channel;
	    } else {
	      return channel;
	    }
	  };
	
	  function MultiplexedConsumer(config1) {
	    var base, base1, channel, opts, ref;
	    this.config = config1 != null ? config1 : {};
	    this.unsubscribe = bind(this.unsubscribe, this);
	    this.subscribe = bind(this.subscribe, this);
	    this._updateSubscriptions = bind(this._updateSubscriptions, this);
	    this._removeSubscriptionHandler = bind(this._removeSubscriptionHandler, this);
	    this._addSubscriptionHandler = bind(this._addSubscriptionHandler, this);
	    this.message = bind(this.message, this);
	    this.longpollTransport = bind(this.longpollTransport, this);
	    this.websocketTransport = bind(this.websocketTransport, this);
	    this.messageHandlers = {};
	    (base = this.config).message || (base.message = this.message);
	    (base1 = this.config).channels || (base1.channels = {});
	    this.config.uri += Consumer.multiplexChannel;
	    this._updateSubscriptions();
	    ref = this.config.channels;
	    for (channel in ref) {
	      opts = ref[channel];
	      this._addSubscriptionHandler(channel, opts);
	    }
	    MultiplexedConsumer.__super__.constructor.call(this, this.config);
	  }
	
	  MultiplexedConsumer.prototype.websocketTransport = function(config) {
	    return new MultiplexedWebSocket(config);
	  };
	
	  MultiplexedConsumer.prototype.longpollTransport = function(config) {
	    return new MultiplexedLongPoll(config);
	  };
	
	  MultiplexedConsumer.prototype.message = function(msg) {
	    var handler;
	    if (handler = this.messageHandlers[msg.channel]) {
	      return handler(this.config.parse(msg.message));
	    }
	  };
	
	  MultiplexedConsumer.prototype._addSubscriptionHandler = function(channel, opts) {
	    if (opts.message) {
	      return this.messageHandlers[channel] = opts.message;
	    }
	  };
	
	  MultiplexedConsumer.prototype._removeSubscriptionHandler = function() {
	    var chan, channelNames, i, len, results;
	    channelNames = 1 <= arguments.length ? slice.call(arguments, 0) : [];
	    results = [];
	    for (i = 0, len = channelNames.length; i < len; i++) {
	      chan = channelNames[i];
	      results.push(delete this.messageHandlers[chan]);
	    }
	    return results;
	  };
	
	  MultiplexedConsumer.prototype._updateSubscriptions = function() {
	    return MultiplexedConsumer.normalizeChannels(this.config);
	  };
	
	  MultiplexedConsumer.prototype.subscribe = function(channel, opts) {
	    if (opts == null) {
	      opts = {};
	    }
	    channel = MultiplexedConsumer.normalizeChannel(channel);
	    this.config.channels[channel] = opts;
	    this._updateSubscriptions();
	    this._addSubscriptionHandler(channel, opts);
	    return this.transport.subscribe(channel, opts);
	  };
	
	  MultiplexedConsumer.prototype.unsubscribe = function() {
	    var channel, channelNames, i, len, ref;
	    channelNames = 1 <= arguments.length ? slice.call(arguments, 0) : [];
	    if (!this.connected()) {
	      return;
	    }
	    for (i = 0, len = channelNames.length; i < len; i++) {
	      channel = channelNames[i];
	      channel = MultiplexedConsumer.normalizeChannel(channel);
	      delete this.config.channels[channel];
	    }
	    this._updateSubscriptions();
	    this._removeSubscriptionHandler.apply(this, channelNames);
	    return (ref = this.transport).unsubscribe.apply(ref, channelNames);
	  };
	
	  return MultiplexedConsumer;
	
	})(Consumer);
	
	module.exports = MultiplexedConsumer;


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var MultiplexedWebSocket, WebSocketTransport,
	  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty,
	  slice = [].slice;
	
	WebSocketTransport = __webpack_require__(6);
	
	MultiplexedWebSocket = (function(superClass) {
	  extend(MultiplexedWebSocket, superClass);
	
	  function MultiplexedWebSocket(args) {
	    this._message = bind(this._message, this);
	    this._open = bind(this._open, this);
	    this.getLastMessageSequence = bind(this.getLastMessageSequence, this);
	    this.unsubscribe = bind(this.unsubscribe, this);
	    this.subscribe = bind(this.subscribe, this);
	    MultiplexedWebSocket.__super__.constructor.call(this, args);
	  }
	
	  MultiplexedWebSocket.prototype.subscribe = function(channel, opts) {
	    return this._sendMessage({
	      multiplex_subscribe: {
	        channel: channel,
	        message_sequence: opts.last_sequence
	      }
	    });
	  };
	
	  MultiplexedWebSocket.prototype.unsubscribe = function() {
	    var channelNames;
	    channelNames = 1 <= arguments.length ? slice.call(arguments, 0) : [];
	    return this._sendMessage({
	      multiplex_unsubscribe: channelNames
	    });
	  };
	
	  MultiplexedWebSocket.prototype.getLastMessageSequence = function() {
	    return this._lastMessageSequence || {};
	  };
	
	  MultiplexedWebSocket.prototype._open = function() {
	    var channel, opts, ref, results;
	    MultiplexedWebSocket.__super__._open.call(this);
	    ref = this.config.channels;
	    results = [];
	    for (channel in ref) {
	      opts = ref[channel];
	      if (this._lastMessageSequence) {
	        opts.last_sequence = this._lastMessageSequence[channel];
	      }
	      if (!opts.last_sequence) {
	        opts.last_sequence = 0;
	      }
	      results.push(this.subscribe(channel, opts));
	    }
	    return results;
	  };
	
	  MultiplexedWebSocket.prototype._message = function(event) {
	    var e, error, frame;
	    frame = this.config.parse(event.data);
	    this._restartKeepAlive();
	    if (!this._isPong(frame)) {
	      try {
	        this._lastMessageSequence || (this._lastMessageSequence = {});
	        this._lastMessageSequence[frame.channel] = frame.last_sequence;
	        return this.config.message(frame);
	      } catch (error) {
	        e = error;
	      }
	    }
	  };
	
	  return MultiplexedWebSocket;
	
	})(WebSocketTransport);
	
	module.exports = MultiplexedWebSocket;


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	var LongPollTransport, MultiplexedLongPoll,
	  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty,
	  slice = [].slice;
	
	LongPollTransport = __webpack_require__(8);
	
	MultiplexedLongPoll = (function(superClass) {
	  extend(MultiplexedLongPoll, superClass);
	
	  function MultiplexedLongPoll(args) {
	    this._success = bind(this._success, this);
	    this._subscriptions = bind(this._subscriptions, this);
	    this._updateLastMessageSequences = bind(this._updateLastMessageSequences, this);
	    this._request = bind(this._request, this);
	    this.unsubscribe = bind(this.unsubscribe, this);
	    this.subscribe = bind(this.subscribe, this);
	    MultiplexedLongPoll.__super__.constructor.call(this, args);
	    this._lastMessageSequence = {};
	  }
	
	  MultiplexedLongPoll.prototype.subscribe = function(channel, opts) {};
	
	  MultiplexedLongPoll.prototype.unsubscribe = function() {
	    var channelNames;
	    channelNames = 1 <= arguments.length ? slice.call(arguments, 0) : [];
	  };
	
	  MultiplexedLongPoll.prototype._request = function() {
	    var data;
	    if (this._stopRequestLoop) {
	      return;
	    }
	    data = this._subscriptions();
	    return this._lastRequest = $.ajax({
	      url: this.config.uri,
	      firehose: true,
	      crossDomain: true,
	      method: "POST",
	      data: data,
	      dataType: "json",
	      timeout: this._timeout,
	      success: this._success,
	      error: this._error,
	      cache: false
	    });
	  };
	
	  MultiplexedLongPoll.prototype._updateLastMessageSequences = function() {
	    var channel, opts, ref, results, seq;
	    ref = this.config.channels;
	    results = [];
	    for (channel in ref) {
	      opts = ref[channel];
	      if (seq = this._lastMessageSequence[channel]) {
	        results.push(opts.last_sequence = seq);
	      } else {
	        if (!opts.last_sequence) {
	          results.push(opts.last_sequence = 0);
	        } else {
	          results.push(void 0);
	        }
	      }
	    }
	    return results;
	  };
	
	  MultiplexedLongPoll.prototype._subscriptions = function() {
	    var channel, opts, ref, subs;
	    this._updateLastMessageSequences();
	    subs = {};
	    ref = this.config.channels;
	    for (channel in ref) {
	      opts = ref[channel];
	      subs[channel] = opts.last_sequence || 0;
	    }
	    return JSON.stringify(subs);
	  };
	
	  MultiplexedLongPoll.prototype._success = function(data, status, jqXhr) {
	    var e, error, message;
	    if (this._needToNotifyOfReconnect || !this._succeeded) {
	      this._needToNotifyOfReconnect = false;
	      this._open(data);
	    }
	    if (this._stopRequestLoop) {
	      return;
	    }
	    if (jqXhr.status === 200) {
	      try {
	        message = JSON.parse(jqXhr.responseText);
	        this._lastMessageSequence || (this._lastMessageSequence = {});
	        this._lastMessageSequence[message.channel] = message.last_sequence;
	        this.config.message(message);
	      } catch (error) {
	        e = error;
	      }
	    }
	    return this.connect(this._okInterval);
	  };
	
	  return MultiplexedLongPoll;
	
	})(LongPollTransport);
	
	module.exports = MultiplexedLongPoll;


/***/ }
]);
//# sourceMappingURL=firehose.js.map