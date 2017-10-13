import Transport from "./transport";
import * as param from "jquery-param";

const INITIAL_PING_TIMEOUT   =  2000;
const KEEPALIVE_PING_TIMEOUT = 20000;

const sendPing = (socket: WebSocket) => socket.send(JSON.stringify({ping: 'PING'}));

const getWebSocket = () => (typeof window !== 'undefined' && window !== null ? (<any>window).WebSocket : undefined) || (typeof global !== 'undefined' && global !== null ? (<any>global).WebSocket : undefined)

export default class WebSocketTransport extends Transport {
  name() : string { return 'WebSocket' }

  static ieSupported() { return (((<any>document).documentMode || 10) > 9) }
  // Check if WebSocket is an object in the window.
  static supported() { return !!getWebSocket(); }
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
      this.socket = new ws(`${this._protocol()}:${this.config.uri}?${param(this._requestParams())}`);
      this.socket.onopen    = this._open.bind(this);
      this.socket.onclose   = this._close.bind(this);
      this.socket.onerror   = this._error.bind(this);
      this.socket.onmessage = this._lookForInitialPong.bind(this);
    } catch (err) {
      if (this.config.failed) {
        this.config.failed(err);
      } else {
        (typeof console !== 'undefined' && console !== null ? console.log(err) : undefined);
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
    sendPing(this.socket);
  }

  _lookForInitialPong(event: any) {
    this._restartKeepAlive();
    if (this._isPong((() => { try { return JSON.parse(event.data); } catch (e) { return {}; } })())) {
      if (this.lastMessageSequence != null) {
        // don't callback to connectionVerified on subsequent reconnects
        this.sendStartingMessageSequence(this.lastMessageSequence);
      } else {
        this.config.webSocket.connectionVerified(this);
      }
    }
  }

  sendStartingMessageSequence(message_sequence: any) {
    this.lastMessageSequence = message_sequence;
    this.socket.onmessage     = this._message;
    this._sendMessage({message_sequence});
    this._needToNotifyOfDisconnect = true;
    Transport.prototype._open.call(this);
  }

  stop() {
    this._cleanUp();
  }

  _message(event: any) {
    const frame = this.config.parse(event.data);
    this._restartKeepAlive();

    if (this._isSubscriptionFailed(frame)) {
      this.config.subscriptionFailed(frame);
    }

    if (!this._isPong(frame)) {
      this.lastMessageSequence = frame.last_sequence;
      this.config.message(this.config.parse(frame.message));
    }
  }

  _close(event: any) {
    if ((event != null ? event.wasClean : undefined)) { this._cleanUp();
    } else { this._error(event); }
  }

  _error(event: any) {
    this._cleanUp();
    if (this._needToNotifyOfDisconnect) {
      this._needToNotifyOfDisconnect = false;
      this.config.disconnected();
    }
    if (this.succeeded) {
      this.connect(this.retryDelay);
    } else if (this.config.failed) {
      this.config.failed(event);
    }
  }

  _cleanUp() {
    this._clearKeepalive();
    if (this.socket != null) {
      this.socket.onopen    = null;
      this.socket.onclose   = null;
      this.socket.onerror   = null;
      this.socket.onmessage = null;
      this.socket.close();
    }
  }

  _restartKeepAlive() {
    const doPing = () => {
      sendPing(this.socket);
      setNextKeepAlive();
    };
    var setNextKeepAlive = () => {
      this.keepaliveTimeout = setTimeout(doPing, KEEPALIVE_PING_TIMEOUT);
    };
    this._clearKeepalive();
    setNextKeepAlive();
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
