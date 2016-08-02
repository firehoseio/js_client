## 1.1.0

- Add support for new `subscriptionFailed` callback for connections
- Allow `params` passed to new connection to be a function or object. If it a function, the function the return value must be an object.

## 1.0.3

- Fix method helper "method not available" for websockets

## 1.0.2

- Fix bug where null messages are sent over WebSockets to client. Issue https://github.com/firehoseio/firehose/issues/51.
- Drop support for Ruby 1.9.3. Documented official Ruby support policy in README.md
