import WebSocketTransport from "./web_socket_transport.js"
import LongPollTransport from "./long_poll_transport.js"

export default class Consumer {

  static get multiplexChannel () {
    return this._multiplexChannel || "channels@firehose"
  }

  static set multiplexChannel (channel) {
    this._multiplexChannel = (channel ||  "channels@firehose")
  }

  constructor(config) {
    // Empty handler for messages.
    this.connected = this.connected.bind(this);
    this.websocketTransport = this.websocketTransport.bind(this);
    this.longpollTransport = this.longpollTransport.bind(this);
    this.connect = this.connect.bind(this);
    this.stop = this.stop.bind(this);
    this._upgradeTransport = this._upgradeTransport.bind(this);
    this._connectPromise = this._connectPromise.bind(this);
    if (config == null) { config = {}; }
    this.config = config;
    if (!this.config.message) { this.config.message = function() {}; }
    // Empty handler for error handling.
    if (!this.config.error) { this.config.error = function() {}; }
    // Empty handler for when we establish a connection.
    if (!this.config.connected) { this.config.connected = function() {}; }
    // Empty handler for when we're disconnected.
    if (!this.config.disconnected) { this.config.disconnected = function() {}; }
    // The initial connection failed. This is probably triggered when a
    // transport, like WebSockets is supported by the browser, but for whatever
    // reason it can't connect (probably a firewall)
    if (!this.config.failed) { this.config.failed = function() {
      throw "Could not connect";
    }; }
    // gets thrown if a subscription request failed
    if (!this.config.subscriptionFailed) { this.config.subscriptionFailed = function() {}; }
    // Params that we'll tack on to the URL. May be either a function or object.
    // If it is the function, the result of the function will be used as the
    // parameters.
    if (!this.config.params) { this.config.params = {}; }
    // Do stuff before we send the message into config.message. The sensible
    // default on the webs is to parse JSON.
    if (!this.config.parse) { this.config.parse = JSON.parse; }

    this._isConnected = false;
    const origConnected = this.config.connected;
    this.config.connected = () => {
      this._isConnected = true;
      return origConnected();
    };
  }

  connected() {
    return this._isConnected;
  }

  websocketTransport(config) {
    return new WebSocketTransport(config);
  }

  longpollTransport(config) {
    return new LongPollTransport(config);
  }

  connect(delay) {
    if (delay == null) { delay = 0; }
    const promise = this._connectPromise();

    this.config.connectionVerified = this._upgradeTransport;
    if (WebSocketTransport.supported()) {
      this.upgradeTimeout = setTimeout(() => {
        const ws = this.websocketTransport(this.config);
        return ws.connect(delay);
      }
      , 500);
    }
    this.transport = this.longpollTransport(this.config);
    this.transport.connect(delay);

    return promise;
  }

  stop() {
    if (this.upgradeTimeout != null) {
      clearTimeout(this.upgradeTimeout);
      this.upgradeTimeout = null;
    }
    this.transport.stop();
  }

  _upgradeTransport(ws) {
    this.transport.stop();
    ws.sendStartingMessageSequence(this.transport.getLastMessageSequence());
    this.transport = ws;
  }

  // Return a promise that will succeed/fail depending on whether or not the
  // initial connection succeeds.
  _connectPromise() {
    const deferred = $.Deferred();

    const origConnected = this.config.connected;
    this.config.connected = () => {
      deferred.resolve();
      if (origConnected) {
        this.config.connected = origConnected;
        return origConnected();
      }
    };

  //  origDisconnected = @config.disconnected
  //  @config.disconnected = =>
  //    deferred.reject()
  //    if origDisconnected
  //      @config.disconnected = origDisconnected
  //      origDisconnected()

    return deferred.promise();
  }
}
