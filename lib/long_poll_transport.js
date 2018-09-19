import Transport from "./transport.js"

export default class LongPollTransport extends Transport {
  get messageSequenceHeader () {
    return this._messageSequenceHeader
  }

  set messageSequenceHeader (str) {
    this._messageSequenceHeader = (str || 'Pragma')
  }

  name() { return 'LongPoll'; }

  // CORS is kinda supported in IE8+ except that its implementation cannot
  // access "simple request" response headers. This means we don't yet have a
  // plan to support IE<10 (when it gets a real XHR2 implementation). Sucks...
  // $.browser.msie and parseInt($.browser.version) >= 8 # DEPRECATED
  static ieSupported() { return (document.documentMode || 10) >= 8; }

  static supported() {
    // IE 8+, FF 3.5+, Chrome 4+, Safari 4+, Opera 12+, iOS 3.2+, Android 2.1+
    let xhr;
    if (xhr = $.ajaxSettings.xhr()) {
      return "withCredentials" in xhr || LongPollTransport.ieSupported();
    }
  }

  constructor(args) {
    super(args);
    this._protocol = this._protocol.bind(this);
    this._request = this._request.bind(this);
    this._requestParams = this._requestParams.bind(this);
    this.stop = this.stop.bind(this);
    this._success = this._success.bind(this);
    this._ping = this._ping.bind(this);
    this._error = this._error.bind(this);

    if (this.config.ssl == null) { this.config.ssl = false; }

    // Configrations specifically for long polling
    if (!this.config.longPoll) { this.config.longPoll = {}; }
    if (!this.config.longPoll.url) { this.config.longPoll.url = `${this._protocol()}:${this.config.uri}`; }
    // How many ms should we wait before timing out the AJAX connection?
    if (!this.config.longPoll.timeout) { this.config.longPoll.timeout = 25000; }
    // TODO - What is @_lagTime for? Can't we just use the @_timeout value?
    // We use the lag time to make the client live longer than the server.
    this._lagTime                  = 5000;
    this._timeout                  = this.config.longPoll.timeout + this._lagTime;
    this._okInterval               = this.config.okInterval || 0;
    this._stopRequestLoop          = false;
    this._lastMessageSequence      = 0;
  }

  // Protocol schema we should use for talking to firehose server.
  _protocol() {
    if (this.config.ssl) { return "https"; } else { return "http"; }
  }

  _request() {
    if (this._stopRequestLoop) { return; }
    // Set the Last Message Sequence in a query string.
    // Ideally we'd use an HTTP header, but android devices don't let us
    // set any HTTP headers for CORS requests.
    const data = this._requestParams();
    data.last_message_sequence = this._lastMessageSequence;
    // TODO: Some of these options will be deprecated in jQuery 1.8
    //       See: http://api.jquery.com/jQuery.ajax/#jqXHR
    return this._lastRequest = $.ajax({
      url:          this.config.longPoll.url,
      firehose:     true,
      crossDomain:  true,
      data,
      timeout:      this._timeout,
      success:      this._success,
      error:        this._error,
      cache:        false
    });
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

  _success(data, status, jqXhr) {
    if (this._needToNotifyOfReconnect || !this._succeeded) {
      this._needToNotifyOfReconnect = false;
      this._open(data);
    }
    if (this._stopRequestLoop) { return; }
    if (jqXhr.status === 200) {
      try {
        // Of course, IE's XDomainRequest doesn't support non-200 success codes.
        const {message, last_sequence} = JSON.parse(jqXhr.responseText);
        this._lastMessageSequence    = last_sequence || 0;
        this.config.message(this.config.parse(message));
      } catch (e) {
        console && console.error(e)
      }
    }
    return this.connect(this._okInterval);
  }

  _ping() {
    // Ping long poll server to verify internet connectivity
    // jQuery CORS doesn't support timeouts and there is no way to access xhr2 object
    // directly so we can't manually set a timeout.
    return this._lastPingRequest = $.ajax({
      url:          this.config.uri,
      method:       'HEAD',
      crossDomain:  true,
      firehose:     true,
      data:         this._requestParams(),
      success:      () => {
        if (this._needToNotifyOfReconnect) {
          this._needToNotifyOfReconnect = false;
          return this.config.connected(this);
        }
      }
    });
  }

  // We need this custom handler to have the connection status
  // properly displayed
  _error(jqXhr, status, error) {
    if (jqXhr.status === 400) {
      error = JSON.parse(jqXhr.responseText);
      if (error.error === 'Subscription failed') {
        this.config.subscriptionFailed(error);
      }
    }

    if (!this._needToNotifyOfReconnect && !this._stopRequestLoop) {
      this._needToNotifyOfReconnect = true;
      this.config.disconnected();
    }
    if (!this._stopRequestLoop) {
      // Ping the server to make sure this isn't a network connectivity error
      setTimeout(this._ping, this._retryDelay + this._lagTime);
      // Reconnect with delay
      return setTimeout(this._request, this._retryDelay);
    }
  }
}
