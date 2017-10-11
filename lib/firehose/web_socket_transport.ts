/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import Transport from "./transport";

const INITIAL_PING_TIMEOUT   =  2000;
const KEEPALIVE_PING_TIMEOUT = 20000;

const sendPing = (socket: WebSocket) => socket.send(JSON.stringify({ping: 'PING'}));

const getWebSocket = () => (typeof window !== 'undefined' && window !== null ? window.WebSocket : undefined) || (typeof global !== 'undefined' && global !== null ? global.WebSocket : undefined);

export default class WebSocketTransport extends Transport {
  name() { return 'WebSocket'; }

  static ieSupported() { return (document.documentMode || 10) > 9; }
  static supported() { return !!getWebSocket(); } // Check if WebSocket is an object in the window.
  protected socket: WebSocket;
  protected _needToNotifyOfDisconnect: boolean;
  protected keepaliveTimeout: any;

  constructor(args = {}) {
    super(args);
    // Configrations specifically for web sockets
    if (!this.config.webSocket) { this.config.webSocket = {}; }
    this.config.webSocket.connectionVerified = this.config.connectionVerified;
  }

  _sendMessage(message: any) {
    return (this.socket != null ? this.socket.send(JSON.stringify(message)) : undefined);
  }

  _request() {
    // Run this in a try/catch block because IE10 inside of a .NET control
    // complains about security zones.
    try {
      const ws = getWebSocket();
      this.socket = new ws(`${this._protocol()}:${this.config.uri}?${$.param(this._requestParams())}`);
      this.socket.onopen    = this._open.bind(this);
      this.socket.onclose   = this._close.bind(this);
      this.socket.onerror   = this._error.bind(this);
      this.socket.onmessage = this._lookForInitialPong.bind(this);
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

  _lookForInitialPong(event: any) {
    this._restartKeepAlive();
    if (this._isPong((() => { try { return JSON.parse(event.data); } catch (e) { return {}; } })())) {
      if (this.lastMessageSequence != null) {
        // don't callback to connectionVerified on subsequent reconnects
        return this.sendStartingMessageSequence(this.lastMessageSequence);
      } else { return this.config.webSocket.connectionVerified(this); }
    }
  }

  sendStartingMessageSequence(message_sequence: any) {
    this.lastMessageSequence = message_sequence;
    this.socket.onmessage     = this._message;
    this._sendMessage({message_sequence});
    this._needToNotifyOfDisconnect = true;
    return Transport.prototype._open.call(this);
  }

  stop() {
    return this._cleanUp();
  }

  _message(event: any) {
    const frame = this.config.parse(event.data);
    this._restartKeepAlive();

    if (this._isSubscriptionFailed(frame)) {
      return this.config.subscriptionFailed(frame);
    }

    if (!this._isPong(frame)) {
      this.lastMessageSequence = frame.last_sequence;
      return this.config.message(this.config.parse(frame.message));
    }
  }

  _close(event: any) {
    if ((event != null ? event.wasClean : undefined)) { return this._cleanUp();
    } else { return this._error(event); }
  }

  _error(event: any) {
    this._cleanUp();
    if (this._needToNotifyOfDisconnect) {
      this._needToNotifyOfDisconnect = false;
      this.config.disconnected();
    }
    if (this.succeeded) {
      return this.connect(this.retryDelay);
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
      this.keepaliveTimeout = null;
    }
  }

  _isPong(o: any) {
    return o.pong === 'PONG';
  }

  _isSubscriptionFailed(o: any) {
    return o.error === 'Subscription Failed';
  }
}
