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

  protected upgradeTimeout: any = null;
  protected transport: WebSocketTransport | LongPollTransport;

  static multiplexChannel = "channels@firehose";

  constructor(protected uri: string, options: ConnectionOptions = {}) {
    super()
    this.options = Object.assign(options, DEFAULT_OPTIONS);
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
          let ws = new WebSocketTransport(this.uri, this.options)
          ws.once(WebSocketTransport.Event.Connected, () => this.upgradeTransport(ws))
          ws.connect();
        }, 500);
      }
      this.transport = new LongPollTransport(this.uri, this.options);
      this.transport.once(WebSocketTransport.Event.Connected, resolve)
      this.transport.once(WebSocketTransport.Event.Failed, reject)
      this.transport.connect();
    })
  }

  disconnect() {
    if (this.upgradeTimeout != null) {
      clearTimeout(this.upgradeTimeout);
      this.upgradeTimeout = null;
    }
    this.transport.disconnect();
  }

  private upgradeTransport(ws: WebSocketTransport) {
    this.transport.disconnect();
    ws.sendStartingMessageSequence(this.transport.getLastMessageSequence());
    this.transport = ws;
  }
}
