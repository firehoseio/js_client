import Transport from "./transport";
import * as param from "jquery-param";

const INITIAL_PING_TIMEOUT   =  2000;
const KEEPALIVE_PING_TIMEOUT = 20000;

const sendPing = (socket: WebSocket) => {
  socket.send(JSON.stringify({ping: 'PING'}));
}

const getWebSocket = () => {
  return (typeof window !== 'undefined' && window !== null ? (<any>window).WebSocket : undefined)
    || (typeof global !== 'undefined' && global !== null ? (<any>global).WebSocket : undefined)
}

const isPong = (o: any) => {
  return o.pong === 'PONG';
}

const isSubscriptionFailed = (o: any) => {
  return o.error === 'Subscription Failed';
}

export default class WebSocketTransport extends Transport {
  static supported() { return !!getWebSocket() }

  protected socket: WebSocket
  protected keepaliveTimeout: any

  disconnect() {
    this.cleanUp()
  }

  sendStartingMessageSequence(message_sequence: any) {
    this.lastMessageSequence = message_sequence;
    this.socket.onmessage     = this.onMessage.bind(this);
    this.didSuccessfullyConnect = true;
    this.sendMessage({message_sequence});
  }

  private sendMessage(message: any) {
    if(this.socket != null) this.socket.send(JSON.stringify(message))
  }

  protected request() {
    // Run this in a try/catch block because IE10 inside of a .NET control
    // complains about security zones.
    try {
      const ws = getWebSocket()
      this.socket = new ws(this.requestUri())
      this.socket.onopen    = this.onSocketOpen.bind(this)
      this.socket.onclose   = this.onClose.bind(this)
      this.socket.onerror   = this.onError.bind(this)
      this.socket.onmessage = this.lookForInitialPong.bind(this)
    } catch (err) {
      this.emit(Transport.Event.Failed, err)
    }
  }

  private requestUri() {
    let protocol = (this.options.insecure ? "ws" : "wss") + "://"
    let main = this.uri.replace(/^\/\//, "")
    let params = this.options.params ? "?" + this.requestParams() : ""
    return protocol + main + params
  }

  private requestParams() {
    if (typeof this.options.params === "function") {
      return this.options.params();
    } else {
      return this.options.params;
    }
  }

  private onSocketOpen() {
    sendPing(this.socket);
  }

  private lookForInitialPong(event: any) {
    this.restartKeepAlive();
    let data = () => { try { return JSON.parse(event.data); } catch (e) { return {}; } }
    if (isPong(data())) {
      if (this.lastMessageSequence != null) {
        this.emit(Transport.Event.Reconnected)
        this.sendStartingMessageSequence(this.lastMessageSequence);
      } else {
        this.emit(Transport.Event.Connected)
      }
    }
  }

  private onMessage(event: any) {
    const frame = this.options.parse(event.data);
    this.restartKeepAlive();

    if (isSubscriptionFailed(frame)) {
      this.emit(Transport.Event.Failed, frame)
    }

    if (!isPong(frame)) {
      this.lastMessageSequence = frame.last_sequence;
      this.emit(Transport.Event.Data, this.options.parse(frame.message), frame.message)
    }
  }

  private onClose(event: any) {
    if (event && event.wasClean) {
      this.cleanUp();
      this.emit(Transport.Event.Closed)
    } else {
      this.onError(event);
    }
  }

  protected onError(event: any) {
    this.cleanUp();
    super.onError(event)
  }

  private cleanUp() {
    this.clearKeepalive();
    if (this.socket != null) {
      this.socket.onopen    = null;
      this.socket.onclose   = null;
      this.socket.onerror   = null;
      this.socket.onmessage = null;
      this.socket.close();
    }
  }

  private restartKeepAlive() {
    const doPing = () => {
      sendPing(this.socket);
      setNextKeepAlive();
    };
    var setNextKeepAlive = () => {
      this.keepaliveTimeout = setTimeout(doPing, KEEPALIVE_PING_TIMEOUT);
    };
    this.clearKeepalive();
    setNextKeepAlive();
  }

  private clearKeepalive() {
    if (this.keepaliveTimeout != null) {
      clearTimeout(this.keepaliveTimeout);
      this.keepaliveTimeout = null;
    }
  }
}
