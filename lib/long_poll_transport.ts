import * as xhr from "xhr"
import Transport from "./transport";

export default class LongPollTransport extends Transport {
  static messageSequenceHeader = "Pragma"
  static LOOP_DELAY = 500

  protected stopRequestLoop: boolean = false;
  protected needToNotifyOfReconnect: boolean = false;
  protected _lastRequest: any;
  protected _lastPingRequest: any;

  constructor(uri, options = {}) {
    super(uri, options)

    this.options.parse = this.options.parse || JSON.parse
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
    const data = this.options.params ? this.requestParams() : {}
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
      if (this.stopRequestLoop) { return; }
      if (err) {
        // Failed sending data to server
        this.emit(Transport.Event.Failed)
      } else {
        if(resp.statusCode === 200) {
          this.onSuccess(body)
        } else {
          this.onError(resp, body)
        }
      }
    })
  }

  disconnect() {
    let e;
    this.stopRequestLoop = true;
    if (this._lastRequest != null) {
      try { this._lastRequest.abort(); } catch (error) { e = error; }
      delete this._lastRequest;
    }
    this.emit(Transport.Event.Disconnected)
  }

  private onSuccess(data: any) {
    if (this.needToNotifyOfReconnect || !this.didSuccessfullyConnect) {
      this.needToNotifyOfReconnect = false;
      this.onOpen(data);
    }

    const {message, last_sequence} = JSON.parse(data);
    this.lastMessageSequence = last_sequence || 0;
    this.emit(Transport.Event.Data, this.options.parse(message))

    this.queueRequest()
  }

  protected onError(resp: any, body: any) {
    if (resp.statusCode === 400) {
      let error = JSON.parse(body);
      if (error.message === 'Subscription failed') {
        this.emit(Transport.Event.Failed)
      }
    } else {
      this.needToNotifyOfReconnect = true;
      super.onError(resp, body)
    }
  }

  private queueRequest() {
    setTimeout(() => {
      if (this.stopRequestLoop) { return; }
      this.request();
    }, LongPollTransport.LOOP_DELAY)
  }
}
