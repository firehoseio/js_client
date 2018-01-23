import WebSocketTransport from "./web_socket_transport.js"

export default class MultiplexedWebSocket extends WebSocketTransport {
  constructor(args) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { this; }).toString();
      let thisName = thisFn.slice(thisFn.indexOf('{') + 1, thisFn.indexOf(';')).trim();
      eval(`${thisName} = this;`);
    }
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.getLastMessageSequence = this.getLastMessageSequence.bind(this);
    this._open = this._open.bind(this);
    this._message = this._message.bind(this);
    super(args);
  }

  subscribe(channel, opts) {
    return this._sendMessage({
      multiplex_subscribe: {
        channel,
        message_sequence: opts.last_sequence
      }
    });
  }

  unsubscribe(...channelNames) {
    return this._sendMessage({
      multiplex_unsubscribe: channelNames});
  }

  getLastMessageSequence() {
    return this._lastMessageSequence || {};
  }

  _open() {
    super._open();
    return (() => {
      const result = [];
      for (let channel in this.config.channels) {
        const opts = this.config.channels[channel];
        if (this._lastMessageSequence) {
          opts.last_sequence = this._lastMessageSequence[channel];
        }

        if (!opts.last_sequence) {
          opts.last_sequence = 0;
        }

        result.push(this.subscribe(channel, opts));
      }
      return result;
    })();
  }

  _message(event) {
    const frame = this.config.parse(event.data);
    this._restartKeepAlive();
    if (!this._isPong(frame)) {
      if (!this._lastMessageSequence) { this._lastMessageSequence = {}; }
      this._lastMessageSequence[frame.channel] = frame.last_sequence;
      return this.config.message(frame);
    }
  }
}
