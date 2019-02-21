class Transport {
  // Class method to determine whether transport is supported by the current browser. Note that while
  // the transport may be supported by the browser, its possible that the network connection won't
  // succeed. That should be accounted for during the initial connecting to the server.
  static supported () {
    return false
  }

  constructor(config) {
    this.connect = this.connect.bind(this);
    this._error = this._error.bind(this);
    this._open = this._open.bind(this);
    this._close = this._close.bind(this);
    this.getLastMessageSequence = this.getLastMessageSequence.bind(this);
    if (config == null) { config = {}; }
    this.config = config;
    if (!this.config.params) { this.config.params = {}; }

    this._retryDelay = 3000;
    return this
  }

  // Lets rock'n'roll! Connect to the server.
  connect(delay) {
    if (delay == null) { delay = 0; }

    if (delay >= 0) {
      this._connectTimeout = setTimeout(this._request, delay);
    } else {
      // Allow synchronous connection if -1 is passed
      this._request()
    }

    return this;
  }

  // Hey subclasses:
  name() {     throw 'not implemented in base Transport'; } // implement this to identify transport type
  stop() {     throw 'not implemented in base Transport'; } // implement this to stop receiving messages
  _request() { throw 'not implemented in base Transport'; } // implement this to handle requests

  // Default error handler
  _error(event) {
    if (this._succeeded) {
      // Lets try to connect again with delay
      this.config.disconnected();
      return this.connect(this._retryDelay);
    } else { return this.config.failed(event); }
  }

  // Default connection established handler
  _open(event) {
    this._succeeded = true;
    return this.config.connected(this);
  }

  // Default connection closed handler
  _close(event) {
    return this.config.disconnected();
  }

  // Useful for reconnecting after any networking hiccups
  getLastMessageSequence() {
    return this._lastMessageSequence || 0;
  }
}

export default Transport
