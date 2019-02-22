import LongPollTransport from "./long_poll_transport.js"

export default class MultiplexedLongPoll extends LongPollTransport {
  constructor(args) {
    super(args);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this._request = this._request.bind(this);
    this._updateLastMessageSequences = this._updateLastMessageSequences.bind(this);
    this._subscriptions = this._subscriptions.bind(this);
    this._success = this._success.bind(this);
    this._lastMessageSequence = {};
  }

  subscribe(channel, opts) {}
    // nothing to be done

  unsubscribe(...channelNames) {
    // abort request if we've unregistered all the channels
    if (Object.keys(this.config.channels).length === 0) {
      try { this._lastRequest && this._lastRequest.abort(); } catch (e) {}
      delete this._lastRequest;
    }
  }

  _request() {
    // Stop requested
    if (this._stopRequestLoop) { return; }

    // No channels subscribed so skip this cycle
    if (Object.keys(this.config.channels).length === 0) {
      return this.connect(this._okInterval);
    }

    const data = this._subscriptions();

    return this._lastRequest = $.ajax({
      url:          `${this._protocol()}:${this.config.uri}`,
      firehose:     true,
      crossDomain:  true,
      method:       "POST",
      data,
      dataType:     "json",
      timeout:      this._timeout,
      success:      this._success,
      error:        this._error,
      cache:        false
    });
  }

  _updateLastMessageSequences() {
    return (() => {
      const result = [];
      for (let channel in this.config.channels) {
        var seq;
        const opts = this.config.channels[channel];
        if (seq = this._lastMessageSequence[channel]) {
          result.push(opts.last_sequence = seq);
        } else {
          if (!opts.last_sequence) {
            result.push(opts.last_sequence = 0);
          } else {
            result.push(undefined);
          }
        }
      }
      return result;
    })();
  }

  _subscriptions() {
    this._updateLastMessageSequences();
    const subs = {};
    for (let channel in this.config.channels) {
      const opts = this.config.channels[channel];
      subs[channel] = opts.last_sequence || 0;
    }
    return JSON.stringify(subs);
  }

  _success(data, status, jqXhr) {
    if (this._needToNotifyOfReconnect || !this._succeeded) {
      this._needToNotifyOfReconnect = false;
      this._open(data);
    }
    if (this._stopRequestLoop) { return; }
    if (jqXhr.status === 200) {
      // Of course, IE's XDomainRequest doesn't support non-200 success codes.
      const message = JSON.parse(jqXhr.responseText);
      if (!this._lastMessageSequence) { this._lastMessageSequence = {}; }
      this._lastMessageSequence[message.channel] = message.last_sequence;
      this.config.message(message);
    }
    return this.connect(this._okInterval);
  }
}
