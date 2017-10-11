import xhr from "xhr"
import LongPollTransport from "./long_poll_transport";

export default class MultiplexedLongPoll extends LongPollTransport {
  protected lastMessageSequence: {[index: string] : number};

  constructor(args = {}) {
    super(args);
    this.lastMessageSequence = {};
  }

  // Nothing to do for these
  subscribe(channel: string, opts: any) {}
  unsubscribe(...channelNames: string[]) {}

  _request() {
    if (this._stopRequestLoop) { return; }
    const data = this._subscriptions();

    return new Promise((resolve: Function, reject: Function) => {
      this._lastRequest = xhr({
        method: "POST",
        firehose: true,
        body: JSON.stringify(data),
        uri: this.config.uri,
        timeout: this._timeout,
        useXDR: true,
        headers: {
          "Content-Type": "application/json"
        }
      }, (err: any, resp: any, body: any) => {
        if (err) {
          this._error(resp, resp.statusCode, err)
          reject(resp)
        }

        this._success(body, resp.statusCode, resp)
        resolve(resp)
      })
    })
  }

  _updateLastMessageSequences() {
    return (() => {
      const result = [];
      for (let channel in this.config.channels) {
        var seq;
        const opts = this.config.channels[channel];
        if (seq = this.lastMessageSequence[channel]) {
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
    const subs = <any>{};
    for (let channel in this.config.channels) {
      const opts = this.config.channels[channel];
      subs[channel] = opts.last_sequence || 0;
    }
    return JSON.stringify(subs);
  }

  _success(data: any, status: number, xhr: any) {
    if (this._needToNotifyOfReconnect || !this.succeeded) {
      this._needToNotifyOfReconnect = false;
      this._open(data);
    }
    if (this._stopRequestLoop) { return; }
    if (status === 200) {
      // Of course, IE's XDomainRequest doesn't support non-200 success codes.
      const message = JSON.parse(xhr.responseText);
      if (!this.lastMessageSequence) { this.lastMessageSequence = {}; }
      this.lastMessageSequence[message.channel] = message.last_sequence;
      this.config.message(message);
    }
    return this.connect(this._okInterval);
  }
}
