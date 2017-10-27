import xhr from "xhr"
import Transport from "./transport";

export default class LongPollTransport extends Transport {
  static messageSequenceHeader = "Pragma"

  protected stopRequestLoop: boolean = false;
  protected needToNotifyOfReconnect: boolean = false;
  protected _lastRequest: any;
  protected _lastPingRequest: any;

  constructor(uri, args = {}) {
    super(uri, args)

    this.lastMessageSequence = 0;
  }

  private requestUri() {
    let protocol = (this.options.insecure ? "http" : "https") + "://"
    let main = this.uri.replace(/^\/\//, "")
    return protocol + main
  }

  request() {
    // Set the Last Message Sequence in a query string.
    // Ideally we'd use an HTTP header, but android devices don't let us
    // set any HTTP headers for CORS requests.
    const data = this.requestParams();
    data.last_message_sequence = this.lastMessageSequence;

    this._lastRequest = xhr({
      firehose: true,
      body: JSON.stringify(data),
      uri: this.requestUri(),
      timeout: this.options.longPollTimeout,
      useXDR: true,
      headers: {
        "Content-Type": "application/json"
      }
    }, (err: any, resp: any, body: any) => {
      if (err) {
        this.onError(resp, resp.statusCode, err)
      }

      this.onSuccess(body, resp.statusCode, resp)
    })
  }

  private requestParams() {
    if (typeof this.options.params === "function") {
      return this.options.params();
    } else {
      return this.options.params;
    }
  }

  disconnect() {
    let e;
    this.stopRequestLoop = true;
    if (this._lastRequest != null) {
      try { this._lastRequest.abort(); } catch (error) { e = error; }
      delete this._lastRequest;
    }
  }

  private onSuccess(data: any, status: number, xhr: any) {
    if (this.needToNotifyOfReconnect || !this.didSuccessfullyConnect) {
      this.needToNotifyOfReconnect = false;
      this.onOpen(data);
    }
    if (this.stopRequestLoop) { return; }
    if (status === 200) {
      // Of course, IE's XDomainRequest doesn't support non-200 success codes.
      const {message, last_sequence} = JSON.parse(xhr.responseText);
      this.lastMessageSequence = last_sequence || 0;
      this.emit(Transport.Event.Data, this.options.parse(message))
    }
    return this.connect();
  }

  // We need this custom handler to have the connection status
  // properly displayed
  protected onError(xhr: any, status: number, error: any) {
    if (status === 400) {
      error = JSON.parse(xhr.responseText);
      if (error.message === 'Subscription failed') {
        this.emit(Transport.Event.Failed)
      }
    }

    if (!this.needToNotifyOfReconnect && !this.stopRequestLoop) {
      this.needToNotifyOfReconnect = true;
      this.emit(Transport.Event.Disconnected)
    }

    if (!this.stopRequestLoop) {
      this.reconnect()
    }
  }
}
