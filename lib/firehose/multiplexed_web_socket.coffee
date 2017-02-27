WebSocketTransport = require "./web_socket_transport"

class MultiplexedWebSocket extends WebSocketTransport
  constructor: (args) ->
    super args

  subscribe: (channel, opts) =>
    @_sendMessage
      multiplex_subscribe:
        channel: channel
        message_sequence: opts.last_sequence

  unsubscribe: (channelNames...) =>
    @_sendMessage
      multiplex_unsubscribe: channelNames

  getLastMessageSequence: =>
    @_lastMessageSequence or {}

  _open: =>
    super()
    for channel, opts of @config.channels
      if @_lastMessageSequence
        opts.last_sequence = @_lastMessageSequence[channel]

      unless opts.last_sequence
        opts.last_sequence = 0

      @subscribe channel, opts

  _message: (event) =>
    frame = @config.parse event.data
    @_restartKeepAlive()
    unless @_isPong frame
      @_lastMessageSequence ||= {}
      @_lastMessageSequence[frame.channel] = frame.last_sequence
      @config.message frame

module.exports = MultiplexedWebSocket
