import MultiplexedConsumer from "../lib/multiplexed_consumer.js"

describe('MultiplexedConsumer', function() {

  const sendMessage = (instance, channel, data) =>
    instance.message({
      channel,
      message: JSON.stringify({ data })})
  ;

  beforeEach(function() {
    this.receivedMessages = [];
    this._isConnected = true;

    this.instance = new MultiplexedConsumer({
      uri: '/',
      okInterval: 9999, // Stop crazy ajax loops during tests
      channels: {
        "/foo": {
          last_sequence: 0,
          message: message => {
            return this.receivedMessages.push(message);
          }
        },
        "/bar": {
          last_sequence: 10,
          message: message => {
            return this.receivedMessages.push(message);
          }
        },
        "noprefix": {
          message: message => {
            return this.receivedMessages.push(message);
          }
        }
      }
    });

    spyOn(this.instance, "connected").and.callFake(() => {
      return this._isConnected;
    });

    return this.instance.transport = {
      subscribe: jasmine.createSpy("subscribe"),
      unsubscribe: jasmine.createSpy("unsubscribe")
    };
  });

  describe('new instance', function() {
    it("normalizes channel names", function() {
      return expect(this.instance.config.channels).toEqual(jasmine.objectContaining({
        "/foo": {last_sequence: 0, message: jasmine.any(Function)},
        "/bar": {last_sequence: 10, message: jasmine.any(Function)},
        "/noprefix": {message: jasmine.any(Function)}}));
  });

    return it("receives only messages from channels it is currently subscribed to", function() {
      let i;
      for (i = 1; i <= 5; i++) {
        sendMessage(this.instance, "/foo", `foo-msg-${i}`);
      }
      for (i = 6; i <= 10; i++) {
        sendMessage(this.instance, "/bar", `bar-msg-${i}`);
      }

      this.instance.unsubscribe("/foo");

      for (i = 11; i <= 15; i++) {
        sendMessage(this.instance, "/foo", `foo-msg-${i}`);
      }
      for (i = 16; i <= 20; i++) {
        sendMessage(this.instance, "/bar", `bar-msg-${i}`);
      }

      return expect(this.receivedMessages).toEqual([].concat(
        ((() => {
        const result = [];
        for (i of [1,2,3,4,5]) {           result.push({data: `foo-msg-${i}`});
        }
        return result;
      })()),
        (() => {
        const result1 = [];
        for (i of [6,7,8,9,10,16,17,18,19,20]) {           result1.push({data: `bar-msg-${i}`});
        }
        return result1;
      })()
      )
      );
    });
  });

  describe("dynamic subscription handling", () =>
    it("subscribes & unsubscribes to a channel dynamically", function() {
      const messages = [];

      sendMessage(this.instance, "/dynamic", "hello 1");
      sendMessage(this.instance, "/dynamic", "hello 2");

      expect(messages).toEqual([]);

      this.instance.subscribe("/dynamic", {
        message(msg) {
          return messages.push(msg);
        }
      }
      );

      sendMessage(this.instance, "/dynamic", "hello 3");
      sendMessage(this.instance, "/dynamic", "hello 4");

      this.instance.unsubscribe("/dynamic");

      sendMessage(this.instance, "/dynamic", "hello 5");
      sendMessage(this.instance, "/dynamic", "hello 6");

      return expect(messages).toEqual([
        {data: "hello 3"},
        {data: "hello 4"},
      ]);
    })
  );

  return describe("while connecting", function() {
    beforeEach(function() {
      return this._isConnected = false;
    });

    it("subscible adds channel config", function() {
      this.instance.subscribe("dynamic",
        {message() { return true; }});

      return expect(this.instance.config.channels).toEqual(jasmine.objectContaining({
        "/dynamic": {message: jasmine.any(Function)}}));
  });

    it("does not call subscribe on the transport", function() {
      this.instance.subscribe("dynamic",
        {message() { return true; }});

      return expect(this.instance.transport.subscribe).not.toHaveBeenCalled();
    });

    it("unsubscribe clears the channel config", function() {
      this.instance.unsubscribe("foo");

      return expect(this.instance.config.channels).not.toEqual(jasmine.objectContaining({
        "/foo": jasmine.any(Object)})
      );
    });

    return it("does not pass unsubscribes to the transport", function() {
      this.instance.unsubscribe("/foo");

      return expect(this.instance.transport.unsubscribe).not.toHaveBeenCalled();
    });
  });
});
