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
