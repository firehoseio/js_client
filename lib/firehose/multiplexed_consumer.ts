/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import Consumer from "./consumer";
import MultiplexedWebSocket from "./multiplexed_web_socket";
import MultiplexedLongPoll from "./multiplexed_long_poll";

export default class MultiplexedConsumer extends Consumer {
  protected transport: MultiplexedWebSocket | MultiplexedLongPoll;

  static subscriptionQuery(config: any) {
    return {
      subscribe: [
        (() => {
        const result = [];
        for (let channel in config.channels) {
          const opts = config.channels[channel];
          result.push(`${channel}!${opts.last_sequence || 0}`);
        }
        return result;
      })()
      ].join(",")
    };
  }

  static normalizeChannels(config: any) {
    const result = [];
    for (let chan in config.channels) {
      const opts = config.channels[chan];
      if (chan[0] !== "/") {
        delete config.channels[chan];
        result.push(config.channels[`/${chan}`] = opts);
      } else {
        result.push(undefined);
      }
    }
    return result;
  }

  static normalizeChannel(channel: string) {
    if (channel[0] !== "/") {
      return `/${channel}`;
    } else {
      return channel;
    }
  }

  protected messageHandlers: {[index: string] : Function};

  constructor(config = {}) {
    super(config);
    this.config = config;
    this.messageHandlers = {};
    if (!this.config.message) { this.config.message = this.message; }
    if (!this.config.channels) { this.config.channels = {}; }
    this.config.uri += Consumer.multiplexChannel;

    MultiplexedConsumer.normalizeChannels(this.config);

    for (let channel in this.config.channels) {
      const opts = this.config.channels[channel];
      this._addSubscriptionHandler(channel, opts);
    }

    super(this.config);
  }

  websocketTransport(config = {}) {
    return new MultiplexedWebSocket(config);
  }

  longpollTransport(config = {}) {
    return new MultiplexedLongPoll(config);
  }

  message(msg: any) {
    let handler = this.messageHandlers[msg.channel];
    if (handler) {
      handler(this.config.parse(msg.message));
    }
  }

  _addSubscriptionHandler(channel: string, opts: any) {
    if (opts.message) {
      return this.messageHandlers[channel] = opts.message;
    }
  }

  subscribe(channel: string, opts = {}) {
    channel = MultiplexedConsumer.normalizeChannel(channel);
    this.config.channels[channel] = opts;

    this._addSubscriptionHandler(channel, opts);
    if (this.connected()) { return this.transport.subscribe(channel, opts); }
  }

  unsubscribe(...channelNames: string[]) {
    for (let channel of channelNames) {
      channel = MultiplexedConsumer.normalizeChannel(channel);
      delete this.config.channels[channel];
      delete this.messageHandlers[channel];
    }

    if (this.connected()) { return this.transport.unsubscribe(channelNames); }
  }
}
