import {EventEmitter} from 'events';

const TransportEvent = {
  Connecting: "connecting",
  Connected: "connected",
  Disconnected: "disconnected",
  Reconnecting: "reconnecting",
  Reconnected: "reconnected",
  Failed: "failed",
  Closed: "closed",
  Data: "data"
}

export default class Transport extends EventEmitter {
  static Event = TransportEvent

  protected lastMessageSequence: number | {[index: string] : number};
  protected didSuccessfullyConnect: boolean = false;

  constructor(
    protected uri: string,
    protected options: ConnectionOptions = {}
  ) {
    super()
  }

  // emit(event: string | symbol, ...args: any[]) {
  //   console.log("TRANSPORT EMIT", event, ...args);
  //   return super.emit(event, ...args)
  // }

  static supported(): boolean {
    return true
  }

  connect() {
    this.emit(Transport.Event.Connecting)
    this.request()
  }

  disconnect() { throw 'Subclass TODO'; }

  getLastMessageSequence(): number | {[index: string] : number} {
    return this.lastMessageSequence || 0;
  }

  protected reconnect() {
    setTimeout(() => {
      this.emit(Transport.Event.Reconnecting)
      this.request()
    }, this.options.retryDelay);
  }

  protected request() { throw 'Subclass TODO'; }

  protected requestParams() {
    if (typeof this.options.params === "function") {
      return this.options.params();
    } else {
      return this.options.params;
    }
  }

  protected onError(one: any, two?: any, three?: any) {
    if (this.didSuccessfullyConnect) {
      // Lets try to connect again with delay
      this.emit(Transport.Event.Disconnected)
      this.reconnect();
    } else {
      this.emit(Transport.Event.Failed)
    }
  }

  protected onOpen(event: Event) {
    this.emit(
      this.didSuccessfullyConnect ?
      Transport.Event.Reconnected :
      Transport.Event.Connected
    )
    this.didSuccessfullyConnect = true;
  }
}
