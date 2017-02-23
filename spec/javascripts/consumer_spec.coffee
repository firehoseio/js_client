describe 'Firehose.Consumer', ->
  createFakeTransport = ->
    class FakeTransport
      constructor: (args) ->
        FakeTransport.args = args

      connect: jasmine.createSpy("connect")

    FakeTransport

  beforeEach ->
    @onConnected = jasmine.createSpy("onconnected")
    @config =
      message: jasmine.createSpy("onmessage")
      error: jasmine.createSpy("onerror")
      connected: @onConnected
      disconnected: jasmine.createSpy("ondisconnected")
      failed: jasmine.createSpy("onfailed")
      uri: 'test_uri'
      okInterval: 9999
    @instance = new Firehose.Consumer @config

    @mocked = {}

    spyOn(@instance, "websocketTransport").and.callFake (config) =>
      @mocked.websocket =
        config: config
        obj: jasmine.createSpyObj('WSTransport', ['connect', 'sendStartingMessageSequence'])
      @mocked.websocket.obj
    spyOn(@instance, "longpollTransport").and.callFake (config) =>
      @mocked.longpoll =
        config: config
        obj: jasmine.createSpyObj('LPTransport', ['connect', 'stop'])
      @mocked.longpoll.obj

    jasmine.clock().install()

  afterEach ->
    jasmine.clock().uninstall()

  describe 'new instance', ->
    describe 'default config', ->
      beforeEach ->
        @instance = new Firehose.Consumer {}
        @subj = @instance.config

      for callback in ['message','error','connected','disconnected','failed']
        it "has a .#{callback} function", ->
          expect( @subj[callback] ).toEqual jasmine.any Function

      it 'has a params object', ->
        expect( @subj.params ).toEqual jasmine.any Object

      it 'has a parse function', ->
        expect( @subj.parse ).toEqual jasmine.any Function

  describe '#connect', ->
    it 'runs without error', -> @instance.connect()

  describe "initial connection", ->
    beforeEach ->
      @connectPromise = @instance.connect()

    it "initially connects via long poll", ->
      expect(@mocked.longpoll.config).toEqual jasmine.objectContaining
        uri: 'test_uri'
        message: @config.message
        error: @config.error
        connected: jasmine.any Function
        disconnected: @config.disconnected
        subscriptionFailed: jasmine.any Function
      expect(@mocked.longpoll.obj.connect).toHaveBeenCalled()

    it "creates a @transport instance", ->
      expect( @instance.transport ).toEqual @mocked.longpoll.obj

    it "sets itself to connected", ->
      expect(@instance.connected()).toEqual false
      @mocked.longpoll.config.connected()
      expect(@instance.connected()).toEqual true

    it "triggers connected handler when connected", ->
      expect(@onConnected).not.toHaveBeenCalled()
      @mocked.longpoll.config.connected()
      expect(@onConnected).toHaveBeenCalled()

    it "resolves the promise on long poll connection", ->
      expect( @connectPromise.state() ).toEqual "pending"
      @mocked.longpoll.config.connected()
      expect( @connectPromise.state() ).toEqual "resolved"

  describe "upgrade to websocket", ->
    beforeEach ->
      @instance.connect()

    it "starts websocket connection after 500ms", ->
      expect(@mocked.websocket).toEqual undefined
      jasmine.clock().tick(500)
      expect(@mocked.websocket.obj.connect).toHaveBeenCalled()

      expect(@mocked.websocket.config).toEqual jasmine.objectContaining
        uri: 'test_uri'
        message: jasmine.any Function
        error: jasmine.any Function
        connected: jasmine.any Function
        disconnected: jasmine.any Function
        subscriptionFailed: jasmine.any Function
        connectionVerified: @instance._upgradeTransport
      expect(@mocked.websocket.obj.connect).toHaveBeenCalled()

    it "triggers upgrade when websocket connects", ->
      jasmine.clock().tick(500)

      expect(@instance.transport).toEqual @mocked.longpoll.obj

      @mocked.longpoll.obj.getLastMessageSequence = -> 12
      @mocked.websocket.config.connectionVerified @mocked.websocket.obj

      expect(@mocked.longpoll.obj.stop).toHaveBeenCalled()
      expect(@mocked.websocket.obj.sendStartingMessageSequence).toHaveBeenCalledWith 12
      expect(@instance.transport).toEqual @mocked.websocket.obj

  describe '#stop', ->
    describe 'when .connect called earlier', ->
      beforeEach ->
        @instance.connect()

      it 'calls stop once on @transport', ->
        @instance.stop()
        expect( @instance.transport.stop ).toHaveBeenCalledTimes 1

      it 'stops the upgrade timeout', ->
        @instance.stop()
        expect( @instance.upgradeTimeout? ).toBe false
