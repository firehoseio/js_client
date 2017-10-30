interface ConnectionOptions {
  insecure?: boolean // Defaults to secure websockets
  params?: Object | Function
  parse?: Function
  retryDelay?: number
  longPollTimeout?: number
}
