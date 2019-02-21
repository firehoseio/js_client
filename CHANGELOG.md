## 1.4.10

[MultiplexedLongPollTransport]
- Fix try/catch syntax

## 1.4.9

[MultiplexedLongPollTransport]
- Fix Multiplexed long poll transport behavior when all channels have been removed

## 1.4.8

[MultiplexedLongPollTransport]
- Set connected state when multiplex long poll starts instead of after the time out

## 1.4.7

[LongPollTransport]
- Set connected state when long poll starts instead of after the time out

## 1.4.6


## 1.4.5

[LongPollTransport]
- Call `this.config.error` in the else condition in `LongPollTransport#_error`

## 1.4.4

[WebSocketTransport]
- Call `this.config.error` in the else condition in `WebSocketTransport#_error`

## 1.4.3

[MultiplexedLongPoll]
- Fix when running on file:// URIs

## 1.4.2

- Lost version

## 1.4.1

[LongPollTransport]
- Throw a `JSON.parse` into a `try/catch` block when parsing a successful `responseText`

## 1.4.0

[Transport]
- Add backward compatible option for `connect`, allowing clients to connect immediately by passing `-1`.

## 1.3.1

- Fix multiplexed consumer not processing any messages

## 1.3.0

- Switch to ES6

## 1.2.0

- Don't swallow exceptions
- Stop trying to unsubscribe while still connecting
- Pass event to fail handlers

## 1.1.0

- Add support for new `subscriptionFailed` callback for connections
- Allow `params` passed to new connection to be a function or object. If it a function, the function the return value must be an object.

## 1.0.3

- Fix method helper "method not available" for websockets

## 1.0.2

- Fix bug where null messages are sent over WebSockets to client. Issue https://github.com/firehoseio/firehose/issues/51.
- Drop support for Ruby 1.9.3. Documented official Ruby support policy in README.md
