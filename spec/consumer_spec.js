const Consumer = require("../lib/firehose/consumer.js")

describe('Consumer', function() {
  const createFakeTransport = function() {
    class FakeTransport {
      static initClass() {
        this.prototype.connect = jasmine.createSpy("connect");
      }
      constructor(args) {
        FakeTransport.args = args;
      }
    }
    FakeTransport.initClass();

    return FakeTransport;
  };

  beforeEach(function() {
    this.onConnected = jasmine.createSpy("onconnected");
    this.config = {
      message: jasmine.createSpy("onmessage"),
      error: jasmine.createSpy("onerror"),
      connected: this.onConnected,
      disconnected: jasmine.createSpy("ondisconnected"),
      failed: jasmine.createSpy("onfailed"),
      uri: 'test_uri',
      okInterval: 9999
    };
    this.instance = new Consumer(this.config);

    this.mocked = {};

    spyOn(this.instance, "websocketTransport").and.callFake(config => {
      this.mocked.websocket = {
        config,
        obj: jasmine.createSpyObj('WSTransport', ['connect', 'sendStartingMessageSequence'])
      };
      return this.mocked.websocket.obj;
    });
    spyOn(this.instance, "longpollTransport").and.callFake(config => {
      this.mocked.longpoll = {
        config,
        obj: jasmine.createSpyObj('LPTransport', ['connect', 'stop'])
      };
      return this.mocked.longpoll.obj;
    });

    return jasmine.clock().install();
  });

  afterEach(() => jasmine.clock().uninstall());

  describe('new instance', () =>
    describe('default config', function() {
      beforeEach(function() {
        this.instance = new Consumer({});
        return this.subj = this.instance.config;
      });

      for (var callback of ['message','error','connected','disconnected','failed']) {
        it(`has a .${callback} function`, function() {
          return expect( this.subj[callback] ).toEqual(jasmine.any(Function));
        });
      }

      it('has a params object', function() {
        return expect( this.subj.params ).toEqual(jasmine.any(Object));
      });

      return it('has a parse function', function() {
        return expect( this.subj.parse ).toEqual(jasmine.any(Function));
      });
    })
  );

  describe('#connect', function() {
    // Runs without error? Not sure what is the intent here. Is this testing
    // whether if a error gets thrown or if the promise gets rejected? NO IDEA.
    xit('runs without error', function() { this.instance.connect(); })
  })

  describe("initial connection", function() {
    beforeEach(function() {
      this.connectPromise = this.instance.connect();
    });

    it("initially connects via long poll", function() {
      expect(this.mocked.longpoll.config).toEqual(jasmine.objectContaining({
        uri: 'test_uri',
        message: this.config.message,
        error: this.config.error,
        connected: jasmine.any(Function),
        disconnected: this.config.disconnected,
        subscriptionFailed: jasmine.any(Function)
      }));
      expect(this.mocked.longpoll.obj.connect).toHaveBeenCalled();
    });

    it("creates a @transport instance", function() {
      expect( this.instance.transport ).toEqual(this.mocked.longpoll.obj);
    });

    it("sets itself to connected", function() {
      expect(this.instance.connected()).toEqual(false);
      this.mocked.longpoll.config.connected();
      expect(this.instance.connected()).toEqual(true);
    });

    it("triggers connected handler when connected", function() {
      expect(this.onConnected).not.toHaveBeenCalled();
      this.mocked.longpoll.config.connected();
      expect(this.onConnected).toHaveBeenCalled();
    });

    it("resolves the promise on long poll connection", function() {
      expect( this.connectPromise.state() ).toEqual("pending");
      this.mocked.longpoll.config.connected();
      expect( this.connectPromise.state() ).toEqual("resolved");
    });
  });

  describe("upgrade to websocket", function() {
    beforeEach(function() {
      this.instance.connect();
    });

    it("starts websocket connection after 500ms", function() {
      expect(this.mocked.websocket).toEqual(undefined);
      jasmine.clock().tick(500);
      expect(this.mocked.websocket.obj.connect).toHaveBeenCalled();

      expect(this.mocked.websocket.config).toEqual(jasmine.objectContaining({
        uri: 'test_uri',
        message: jasmine.any(Function),
        error: jasmine.any(Function),
        connected: jasmine.any(Function),
        disconnected: jasmine.any(Function),
        subscriptionFailed: jasmine.any(Function),
        connectionVerified: this.instance._upgradeTransport
      }));
      expect(this.mocked.websocket.obj.connect).toHaveBeenCalled();
    });

    it("triggers upgrade when websocket connects", function() {
      jasmine.clock().tick(500);

      expect(this.instance.transport).toEqual(this.mocked.longpoll.obj);

      this.mocked.longpoll.obj.getLastMessageSequence = () => 12;
      this.mocked.websocket.config.connectionVerified(this.mocked.websocket.obj);

      expect(this.mocked.longpoll.obj.stop).toHaveBeenCalled();
      expect(this.mocked.websocket.obj.sendStartingMessageSequence).toHaveBeenCalledWith(12);
      expect(this.instance.transport).toEqual(this.mocked.websocket.obj);
    });
  });

  describe('#stop', () =>
    describe('when .connect called earlier', function() {
      beforeEach(function() {
        this.instance.connect();
      });

      it('calls stop once on @transport', function() {
        this.instance.stop();
        expect( this.instance.transport.stop ).toHaveBeenCalledTimes(1);
      });

      it('stops the upgrade timeout', function() {
        this.instance.stop();
        expect( this.instance.upgradeTimeout != null ).toBe(false);
      });
    })
  );
});
