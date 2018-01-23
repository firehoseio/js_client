/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const LongPollTransport = require("./long_poll_transport");

class MultiplexedLongPoll extends LongPollTransport {
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
    this._request = this._request.bind(this);
    this._updateLastMessageSequences = this._updateLastMessageSequences.bind(this);
    this._subscriptions = this._subscriptions.bind(this);
    this._success = this._success.bind(this);
    super(args);
    this._lastMessageSequence = {};
  }

  subscribe(channel, opts) {}
    // nothing to be done

  unsubscribe(...channelNames) {}
    // same here

  _request() {
    if (this._stopRequestLoop) { return; }
    const data = this._subscriptions();

    return this._lastRequest = $.ajax({
      url:          this.config.uri,
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

module.exports = MultiplexedLongPoll;
