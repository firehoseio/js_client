import WebSocketTransport from "./web_socket_transport";

export default class MultiplexedWebSocket extends WebSocketTransport {
  protected lastMessageSequence: {[index: string] : number};

  subscribe(channel: string, opts: any) {
    this._sendMessage({
      multiplex_subscribe: {
        channel,
        message_sequence: opts.last_sequence
      }
    });
  }

  unsubscribe(...channelNames: string[]) {
    this._sendMessage({
      multiplex_unsubscribe: channelNames
    });
  }

  getLastMessageSequence() {
    return this.lastMessageSequence || {};
  }

  _open() {
    super._open();
    for (let channel in this.config.channels) {
      const opts = this.config.channels[channel];
      if (this.lastMessageSequence) {
        opts.last_sequence = this.lastMessageSequence[channel];
      }

      if (!opts.last_sequence) {
        opts.last_sequence = 0;
      }

      this.subscribe(channel, opts);
    }
  }

  _message(event: any) {
    const frame = this.config.parse(event.data);
    this._restartKeepAlive();
    if (!this._isPong(frame)) {
      if (!this.lastMessageSequence) { this.lastMessageSequence = {}; }
      this.lastMessageSequence[frame.channel] = frame.last_sequence;
      return this.config.message(frame);
    }
  }
}
