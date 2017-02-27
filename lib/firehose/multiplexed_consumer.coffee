Consumer = require "./consumer"
MultiplexedWebSocket = require "./multiplexed_web_socket"
MultiplexedLongPoll = require "./multiplexed_long_poll"

class MultiplexedConsumer extends Consumer
  @subscriptionQuery: (config) ->
    {
      subscribe: [
        "#{channel}!#{opts.last_sequence || 0}" for channel, opts of config.channels
      ].join(",")
    }

  @normalizeChannels: (config) ->
    for chan, opts of config.channels
      if chan[0] != "/"
        delete config.channels[chan]
        config.channels["/" + chan] = opts

  @normalizeChannel: (channel) ->
    if channel[0] != "/"
      return "/" + channel
    else
      return channel

  constructor: (@config = {}) ->
    @messageHandlers = {}
    @config.message ||= @message
    @config.channels ||= {}
    @config.uri += Consumer.multiplexChannel

    MultiplexedConsumer.normalizeChannels(@config)

    for channel, opts of @config.channels
      @_addSubscriptionHandler(channel, opts)

    super(@config)

  websocketTransport: (config) =>
    new MultiplexedWebSocket(config)

  longpollTransport: (config) =>
    new MultiplexedLongPoll(config)

  message: (msg) =>
    if handler = @messageHandlers[msg.channel]
      handler(@config.parse msg.message)

  _addSubscriptionHandler: (channel, opts) =>
    if opts.message
      @messageHandlers[channel] = opts.message

  subscribe: (channel, opts = {}) =>
    channel = MultiplexedConsumer.normalizeChannel(channel)
    @config.channels[channel] = opts

    @_addSubscriptionHandler(channel, opts)
    @transport.subscribe(channel, opts) if @connected()

  unsubscribe: (channelNames...) =>
    for channel in channelNames
      channel = MultiplexedConsumer.normalizeChannel(channel)
      delete @config.channels[channel]
      delete @messageHandlers[channel]

    @transport.unsubscribe(channelNames...) if @connected()

module.exports = MultiplexedConsumer
