/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import xhr from "xhr"
import Transport from "./transport";

export default class LongPollTransport extends Transport {
  static messageSequenceHeader = "Pragma"
  // We use the lag time to make the client live longer than the server.
  protected _lagTime = 5000;
  protected _timeout: number;
  protected _okInterval: number;
  protected _stopRequestLoop: boolean;
  protected _needToNotifyOfReconnect: boolean;
  protected _lastRequest: any;
  protected _lastPingRequest: any;

  name() : string { return 'LongPoll' }

  // CORS is kinda supported in IE8+ except that its implementation cannot
  // access "simple request" response headers. This means we don't yet have a
  // plan to support IE<10 (when it gets a real XHR2 implementation). Sucks...
  // $.browser.msie and parseInt($.browser.version) >= 8 # DEPRECATED
  static ieSupported() { return ((<any>document).documentMode || 10) >= 8 }

  // NOTE: xhr npm package is supported everywhere else except for IE < 8
  // > https://github.com/naugtur/xhr#xhr
  static supported() {
    return LongPollTransport.ieSupported()
  }

  constructor(args = {}) {
    super(args);

    if (this.config.ssl == null) { this.config.ssl = false; }

    // Configrations specifically for long polling
    if (!this.config.longPoll) { this.config.longPoll = {}; }
    if (!this.config.longPoll.url) { this.config.longPoll.url = `${this._protocol()}:${this.config.uri}`; }
    // How many ms should we wait before timing out the AJAX connection?
    if (!this.config.longPoll.timeout) { this.config.longPoll.timeout = 25000; }
    this._timeout                  = this.config.longPoll.timeout + this._lagTime;
    this._okInterval               = this.config.okInterval || 0;
    this._stopRequestLoop          = false;
    this.lastMessageSequence      = 0;
  }

  // Protocol schema we should use for talking to firehose server.
  _protocol() {
    if (this.config.ssl) { return "https"; } else { return "http"; }
  }

  _request() {
    return new Promise((resolve: Function, reject: Function) => {
      if (this._stopRequestLoop) { resolve() }

      // Set the Last Message Sequence in a query string.
      // Ideally we'd use an HTTP header, but android devices don't let us
      // set any HTTP headers for CORS requests.
      const data = this._requestParams();
      data.last_message_sequence = this.lastMessageSequence;

      this._lastRequest = xhr({
        firehose: true,
        body: JSON.stringify(data),
        uri: this.config.longPoll.url,
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

  _requestParams() {
    if (typeof this.config.params === "function") {
      return this.config.params();
    } else {
      return this.config.params;
    }
  }

  stop() {
    let e;
    this._stopRequestLoop = true;
    if (this._lastRequest != null) {
      try { this._lastRequest.abort(); } catch (error) { e = error; }
      delete this._lastRequest;
    }
    if (this._lastPingRequest != null) {
      try { this._lastPingRequest.abort(); } catch (error1) { e = error1; }
      return delete this._lastPingRequest;
    }
  }

  _success(data: any, status: number, xhr: any) {
    if (this._needToNotifyOfReconnect || !this.succeeded) {
      this._needToNotifyOfReconnect = false;
      this._open(data);
    }
    if (this._stopRequestLoop) { return; }
    if (status === 200) {
      // Of course, IE's XDomainRequest doesn't support non-200 success codes.
      const {message, last_sequence} = JSON.parse(xhr.responseText);
      this.lastMessageSequence    = last_sequence || 0;
      this.config.message(this.config.parse(message));
    }
    return this.connect(this._okInterval);
  }

  _ping() {
    return new Promise((resolve: Function, reject: Function) => {
      this._lastPingRequest = xhr({
        method: "HEAD",
        firehose: true,
        body: JSON.stringify(this._requestParams()),
        uri: this.config.uri,
        useXDR: true,
        headers: {
          "Content-Type": "application/json"
        }
      }, (err: any, resp: any, body: any) => {
        if (err) {
          reject(err)
        }

        if (this._needToNotifyOfReconnect) {
          this._needToNotifyOfReconnect = false;
          resolve(this.config.connected(this))
        } else {
          resolve(resp)
        }
      })
    })
  }

  // We need this custom handler to have the connection status
  // properly displayed
  _error(xhr: any, status: number, error: any) {
    if (status === 400) {
      error = JSON.parse(xhr.responseText);
      if (error.message === 'Subscription failed') {
        this.config.subscriptionFailed(error);
      }
    }

    if (!this._needToNotifyOfReconnect && !this._stopRequestLoop) {
      this._needToNotifyOfReconnect = true;
      this.config.disconnected();
    }
    if (!this._stopRequestLoop) {
      // Ping the server to make sure this isn't a network connectivity error
      setTimeout(this._ping.bind(this), this.retryDelay + this._lagTime);
      // Reconnect with delay
      setTimeout(this._request.bind(this), this.retryDelay);
    }
  }
}
