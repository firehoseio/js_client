import {EventEmitter} from 'events';
import WebSocketTransport from "./web_socket_transport";
import LongPollTransport from "./long_poll_transport";

enum ConnectionState {
  Init,
  Connected,
  Connecting,
  Reconnecting,
  Disconnected
}

enum ConnectionType {
  LongPoll,
  WebSocket
}

const DEFAULT_OPTIONS = {
  parse: JSON.parse,
  retryDelay: 3000,
  longPollTimeout: 30000
}

export default class Connection extends EventEmitter {
  static version = __VERSION__
  static codeName = __CODE_NAME__

  protected options: ConnectionOptions;
  protected state: ConnectionState = ConnectionState.Init;
  protected type: ConnectionType;
  protected transport: WebSocketTransport | LongPollTransport;
  protected upgradeTimeout: any = null;
  // Used so we can clean this up if we disconnect during upgrade
  protected wst: WebSocketTransport;

  static multiplexChannel = "channels@firehose";

  constructor(protected uri: string, options: ConnectionOptions = {}) {
    super()
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
  }

  emit(event: string | symbol, ...args: any[]) {
    console.log("CONNECTION EMIT", typeof this.transport, event, ...args);
    return super.emit(event, ...args)
  }

  getState() {
    return ConnectionState[this.state];
  }

  getType() {
    return ConnectionType[this.type];
  }

  connect() {
    return new Promise((resolve, reject) => {

      if (WebSocketTransport.supported()) {
        this.upgradeTimeout = setTimeout(() => {
          this.wst = new WebSocketTransport(this.uri, this.options)
          this.wst.once(WebSocketTransport.Event.Connected, this.upgradeTransport.bind(this))
          this.wst.connect();
        }, 500);
      }

      this.transport = new LongPollTransport(this.uri, this.options);
      this.transport.once(LongPollTransport.Event.Connected, resolve)
      this.transport.once(LongPollTransport.Event.Failed, reject)
      this.transport.connect();
    })
  }

  disconnect() {
    if (this.upgradeTimeout != null) {
      clearTimeout(this.upgradeTimeout);
      this.upgradeTimeout = null;
    }
    if (this.wst != null) {
      try {
        this.wst.disconnect()
      } catch(e) {}
    }
    this.transport.disconnect();
  }

  private upgradeTransport() {
    this.transport.disconnect();
    this.wst.sendStartingMessageSequence(this.transport.getLastMessageSequence());
    this.transport = this.wst;
  }
}
