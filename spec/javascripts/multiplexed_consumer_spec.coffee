describe 'Firehose.MultiplexedConsumer', ->

  sendMessage = (instance, channel, data) ->
    instance.message
      channel: channel
      message: JSON.stringify { data: data }

  beforeEach ->
    @receivedMessages = []
    @_isConnected = true

    @instance = new Firehose.MultiplexedConsumer
      uri: '/'
      okInterval: 9999 # Stop crazy ajax loops during tests
      channels:
        "/foo":
          last_sequence: 0
          message: (message) =>
            @receivedMessages.push message
        "/bar":
          last_sequence: 10
          message: (message) =>
            @receivedMessages.push message
        "noprefix":
          message: (message) =>
            @receivedMessages.push message

    spyOn(@instance, "connected").and.callFake =>
      @_isConnected

    @instance.transport =
      subscribe: jasmine.createSpy("subscribe")
      unsubscribe: jasmine.createSpy("unsubscribe")

  describe 'new instance', ->
    it "normalizes channel names", ->
      expect(@instance.config.channels).toEqual jasmine.objectContaining
        "/foo": {last_sequence: 0, message: jasmine.any(Function)}
        "/bar": {last_sequence: 10, message: jasmine.any(Function)}
        "/noprefix": {message: jasmine.any(Function)}

    it "receives only messages from channels it is currently subscribed to", ->
      for i in [1..5]
        sendMessage @instance, "/foo", "foo-msg-#{i}"
      for i in [6..10]
        sendMessage @instance, "/bar", "bar-msg-#{i}"

      @instance.unsubscribe("/foo")

      for i in [11..15]
        sendMessage @instance, "/foo", "foo-msg-#{i}"
      for i in [16..20]
        sendMessage @instance, "/bar", "bar-msg-#{i}"

      expect(@receivedMessages).toEqual [].concat(
        {data: "foo-msg-#{i}"} for i in [1,2,3,4,5],
        {data: "bar-msg-#{i}"} for i in [6,7,8,9,10,16,17,18,19,20]
      )

  describe "dynamic subscription handling", ->
    it "subscribes & unsubscribes to a channel dynamically", ->
      messages = []

      sendMessage @instance, "/dynamic", "hello 1"
      sendMessage @instance, "/dynamic", "hello 2"

      expect(messages).toEqual([])

      @instance.subscribe "/dynamic",
        message: (msg) ->
          messages.push(msg)

      sendMessage @instance, "/dynamic", "hello 3"
      sendMessage @instance, "/dynamic", "hello 4"

      @instance.unsubscribe "/dynamic"

      sendMessage @instance, "/dynamic", "hello 5"
      sendMessage @instance, "/dynamic", "hello 6"

      expect(messages).toEqual([
        {data: "hello 3"},
        {data: "hello 4"},
      ])

  describe "while connecting", ->
    beforeEach ->
      @_isConnected = false

    it "subscible adds channel config", ->
      @instance.subscribe "dynamic",
        message: () -> true

      expect(@instance.config.channels).toEqual jasmine.objectContaining
        "/dynamic": {message: jasmine.any(Function)}

    it "does not call subscribe on the transport", ->
      @instance.subscribe "dynamic",
        message: () -> true

      expect(@instance.transport.subscribe).not.toHaveBeenCalled()

    it "unsubscribe clears the channel config", ->
      @instance.unsubscribe "foo"

      expect(@instance.config.channels).not.toEqual jasmine.objectContaining
        "/foo": jasmine.any Object

    it "does not pass unsubscribes to the transport", ->
      @instance.unsubscribe "/foo"

      expect(@instance.transport.unsubscribe).not.toHaveBeenCalled()
