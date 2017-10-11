/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import WebSocketTransport from "./web_socket_transport";

export default class MultiplexedWebSocket extends WebSocketTransport {
  subscribe(channel: string, opts: any) {
    return this._sendMessage({
      multiplex_subscribe: {
        channel,
        message_sequence: opts.last_sequence
      }
    });
  }

  unsubscribe(...channelNames: string[]) {
    return this._sendMessage({
      multiplex_unsubscribe: channelNames
    });
  }

  getLastMessageSequence() {
    return this.lastMessageSequence || {};
  }

  _open() {
    super._open();
    return (() => {
      const result = [];
      for (let channel in this.config.channels) {
        const opts = this.config.channels[channel];
        if (this.lastMessageSequence) {
          opts.last_sequence = this.lastMessageSequence[channel];
        }

        if (!opts.last_sequence) {
          opts.last_sequence = 0;
        }

        result.push(this.subscribe(channel, opts));
      }
      return result;
    })();
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
