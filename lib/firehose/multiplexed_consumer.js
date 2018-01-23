/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Consumer = require("./consumer");
const MultiplexedWebSocket = require("./multiplexed_web_socket");
const MultiplexedLongPoll = require("./multiplexed_long_poll");

class MultiplexedConsumer extends Consumer {
  static subscriptionQuery(config) {
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

  static normalizeChannels(config) {
    return (() => {
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
    })();
  }

  static normalizeChannel(channel) {
    if (channel[0] !== "/") {
      return `/${channel}`;
    } else {
      return channel;
    }
  }

  constructor(config) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { this; }).toString();
      let thisName = thisFn.slice(thisFn.indexOf('{') + 1, thisFn.indexOf(';')).trim();
      eval(`${thisName} = this;`);
    }
    this.websocketTransport = this.websocketTransport.bind(this);
    this.longpollTransport = this.longpollTransport.bind(this);
    this.message = this.message.bind(this);
    this._addSubscriptionHandler = this._addSubscriptionHandler.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    if (config == null) { config = {}; }
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

  websocketTransport(config) {
    return new MultiplexedWebSocket(config);
  }

  longpollTransport(config) {
    return new MultiplexedLongPoll(config);
  }

  message(msg) {
    let handler;
    if (handler = this.messageHandlers[msg.channel]) {
      return handler(this.config.parse(msg.message));
    }
  }

  _addSubscriptionHandler(channel, opts) {
    if (opts.message) {
      return this.messageHandlers[channel] = opts.message;
    }
  }

  subscribe(channel, opts) {
    if (opts == null) { opts = {}; }
    channel = MultiplexedConsumer.normalizeChannel(channel);
    this.config.channels[channel] = opts;

    this._addSubscriptionHandler(channel, opts);
    if (this.connected()) { return this.transport.subscribe(channel, opts); }
  }

  unsubscribe(...channelNames) {
    for (let channel of Array.from(channelNames)) {
      channel = MultiplexedConsumer.normalizeChannel(channel);
      delete this.config.channels[channel];
      delete this.messageHandlers[channel];
    }

    if (this.connected()) { return this.transport.unsubscribe(...Array.from(channelNames || [])); }
  }
}

module.exports = MultiplexedConsumer;
