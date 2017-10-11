/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
export default class Transport {
  public retryDelay = 3000;
  protected config: any;
  protected lastMessageSequence: number | {[index: string] : number};
  protected succeeded: boolean;

  constructor(config = {}) {
    this.config = config;
    if (!this.config.params) { this.config.params = {}; }

    this;
  }

  static supported() {
    false
  }

  // Lets rock'n'roll! Connect to the server.
  connect(delay = 0) {
    setTimeout(this._request.bind(this), delay);
    return this;
  }

  // Hey subclasses:
  name() {     throw 'not implemented in base Transport'; } // implement this to identify transport type
  stop() {     throw 'not implemented in base Transport'; } // implement this to stop receiving messages
  _request() { throw 'not implemented in base Transport'; } // implement this to handle requests

  // Default error handler
  _error(one: any, two?: any, three?: any) {
    if (this.succeeded) {
      // Lets try to connect again with delay
      this.config.disconnected();
      return this.connect(this.retryDelay);
    } else { return this.config.failed(event); }
  }

  // Default connection established handler
  _open(event: Event) {
    this.succeeded = true;
    return this.config.connected(this);
  }

  // Default connection closed handler
  _close(event: Event) {
    return this.config.disconnected();
  }

  // Useful for reconnecting after any networking hiccups
  getLastMessageSequence() {
    return this.lastMessageSequence || 0;
  }
}
