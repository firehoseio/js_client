import Transport from "./transport.js"

const INITIAL_PING_TIMEOUT   =  2000;
const KEEPALIVE_PING_TIMEOUT = 20000;

const sendPing = (socket) => {
  socket.send(JSON.stringify({ping: 'PING'}))
}

const getWebSocket = () => {
  return (typeof window !== 'undefined' && window !== null ? window.WebSocket : undefined) || (typeof global !== 'undefined' && global !== null ? global.WebSocket : undefined)
}

export default class WebSocketTransport extends Transport {
  name() { return 'WebSocket'; }

  static ieSupported() { return (document.documentMode || 10) > 9; }
  static supported() { return !!getWebSocket(); } // Check if WebSocket is an object in the window.

  constructor(args) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { this; }).toString();
      let thisName = thisFn.slice(thisFn.indexOf('{') + 1, thisFn.indexOf(';')).trim();
      eval(`${thisName} = this;`);
    }
    this._sendMessage = this._sendMessage.bind(this);
    this._request = this._request.bind(this);
    this._protocol = this._protocol.bind(this);
    this._requestParams = this._requestParams.bind(this);
    this._open = this._open.bind(this);
    this._lookForInitialPong = this._lookForInitialPong.bind(this);
    this.sendStartingMessageSequence = this.sendStartingMessageSequence.bind(this);
    this.stop = this.stop.bind(this);
    this._message = this._message.bind(this);
    this._close = this._close.bind(this);
    this._error = this._error.bind(this);
    this._cleanUp = this._cleanUp.bind(this);
    this._restartKeepAlive = this._restartKeepAlive.bind(this);
    this._clearKeepalive = this._clearKeepalive.bind(this);
    super(args);
    // Configrations specifically for web sockets
    if (!this.config.webSocket) { this.config.webSocket = {}; }
    this.config.webSocket.connectionVerified = this.config.connectionVerified;
  }

  _sendMessage(message) {
    return (this.socket != null ? this.socket.send(JSON.stringify(message)) : undefined);
  }

  _request() {
    // Run this in a try/catch block because IE10 inside of a .NET control
    // complains about security zones.
    try {
      const ws = getWebSocket();
      this.socket = new ws(`${this._protocol()}:${this.config.uri}?${$.param(this._requestParams())}`);
      this.socket.onopen    = this._open;
      this.socket.onclose   = this._close;
      this.socket.onerror   = this._error;
      return this.socket.onmessage = this._lookForInitialPong;
    } catch (err) {
      if (this.config.failed) {
        return this.config.failed(err);
      } else {
        return (typeof console !== 'undefined' && console !== null ? console.log(err) : undefined);
      }
    }
  }

  // Protocol schema we should use for talking to firehose server.
  _protocol() {
    if (this.config.ssl) { return "wss"; } else { return "ws"; }
  }

  _requestParams() {
    if (typeof this.config.params === "function") {
      return this.config.params();
    } else {
      return this.config.params;
    }
  }

  _open() {
    return sendPing(this.socket);
  }

  _lookForInitialPong(event) {
    this._restartKeepAlive();
    if (this._isPong((() => { try { return JSON.parse(event.data); } catch (e) { return {}; } })())) {
      if (this._lastMessageSequence != null) {
        // don't callback to connectionVerified on subsequent reconnects
        return this.sendStartingMessageSequence(this._lastMessageSequence);
      } else { return this.config.webSocket.connectionVerified(this); }
    }
  }

  sendStartingMessageSequence(message_sequence) {
    this._lastMessageSequence = message_sequence;
    this.socket.onmessage     = this._message;
    this._sendMessage({message_sequence});
    this._needToNotifyOfDisconnect = true;
    return Transport.prototype._open.call(this);
  }

  stop() {
    return this._cleanUp();
  }

  _message(event) {
    const frame = this.config.parse(event.data);
    this._restartKeepAlive();

    if (this._isSubscriptionFailed(frame)) {
      return this.config.subscriptionFailed(frame);
    }

    if (!this._isPong(frame)) {
      this._lastMessageSequence = frame.last_sequence;
      return this.config.message(this.config.parse(frame.message));
    }
  }

  _close(event) {
    if ((event != null ? event.wasClean : undefined)) { return this._cleanUp();
    } else { return this._error(event); }
  }

  _error(event) {
    this._cleanUp();
    if (this._needToNotifyOfDisconnect) {
      this._needToNotifyOfDisconnect = false;
      this.config.disconnected();
    }
    if (this._succeeded) {
      return this.connect(this._retryDelay);
    } else if (this.config.failed) {
      return this.config.failed(event);
    }
  }

  _cleanUp() {
    this._clearKeepalive();
    if (this.socket != null) {
      this.socket.onopen    = null;
      this.socket.onclose   = null;
      this.socket.onerror   = null;
      this.socket.onmessage = null;
      return this.socket.close();
    }
  }
      // delete @socket

  _restartKeepAlive() {
    const doPing = () => {
      sendPing(this.socket);
      return setNextKeepAlive();
    };
    var setNextKeepAlive = () => {
      return this.keepaliveTimeout = setTimeout(doPing, KEEPALIVE_PING_TIMEOUT);
    };
    this._clearKeepalive();
    return setNextKeepAlive();
  }

  _clearKeepalive() {
    if (this.keepaliveTimeout != null) {
      clearTimeout(this.keepaliveTimeout);
      return this.keepaliveTimeout = null;
    }
  }

  _isPong(o) {
    return o.pong === 'PONG';
  }

  _isSubscriptionFailed(o) {
    return o.error === 'Subscription Failed';
  }
}
