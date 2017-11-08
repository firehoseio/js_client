import * as xhr from "xhr"
import * as xhrMock from 'xhr-mock';
import {EventEmitter} from 'events';
import LongPollTransport from "../lib/long_poll_transport"

const whenEventFired = (item: EventEmitter, event:string) => {
  let handler = jasmine.createSpy(event)
  item.on(event, handler)
  return handler
}

describe("LongPollTransport", () => {

  beforeEach(() => {
    this.origXhr = (<any>xhr).XDomainRequest;
    (<any>xhr).XDomainRequest = xhrMock.XMLHttpRequest

    this.setupSuccessfulConnection = () => {
      this.transport = new LongPollTransport("localhost:8080")
      this.transport.connect()
      jasmine.clock().tick(10)
      this.server.send(`{"pong": "PONG"}`)
      jasmine.clock().tick(10)
      this.transport.sendStartingMessageSequence(10)
      jasmine.clock().tick(10)
    }

    jasmine.clock().install()
  })

  afterEach(() => {
    (<any>xhr).XDomainRequest = this.origXhr
    xhrMock.reset()
    if(this.transport) {
      this.transport.disconnect()
    }

    jasmine.clock().uninstall()
  })

  describe("#connect", () => {
    beforeEach(() => {
      this.transport = new LongPollTransport("example.com/my/channel")

      this.transportConnecting = whenEventFired(this.transport, LongPollTransport.Event.Connecting)
      this.transportReconnecting = whenEventFired(this.transport, LongPollTransport.Event.Reconnecting)
      this.transportData = whenEventFired(this.transport, LongPollTransport.Event.Data)
      this.transportConnected = whenEventFired(this.transport, LongPollTransport.Event.Connected)
      this.transportFailed = whenEventFired(this.transport, LongPollTransport.Event.Failed)
      this.transportDisconnected = whenEventFired(this.transport, LongPollTransport.Event.Disconnected)
    })

    it("sends an long-poll XHR with last_message_sequence", (end) => {
      xhrMock.mock((req, res) => {
        expect(req._url).toBe("https://example.com/my/channel")
        expect(req._body).toBe('{"last_message_sequence":0}')
        end()
      })

      this.transport.connect()
      jasmine.clock().tick(10)

      expect(this.transportConnecting).toHaveBeenCalled()
    })

    describe("successful connection", () => {
      beforeEach(() => {
        xhrMock.mock((req, res) => {
          return res
            .status(200)
            .body(JSON.stringify({
              message: JSON.stringify({test: "response"}),
              last_sequence: 666
            }))
        })

        this.transport.connect()
        jasmine.clock().tick(10)
      })

      it("notifies and passes on data", () => {
        expect(this.transportConnected).toHaveBeenCalled()
        expect(this.transport.getLastMessageSequence()).toBe(666)
        expect(this.transportData).toHaveBeenCalledWith({test: "response"})
      })

      it("sends another long-poll with updated last message", () => {
        xhrMock.reset()
        xhrMock.mock((req, res) => {
          this.calledWithSeq = JSON.parse(req._body).last_message_sequence
          return res
            .status(200)
            .body(JSON.stringify({
              message: JSON.stringify({test: "another response"}),
              last_sequence: 667
            }))
        })
        jasmine.clock().tick(LongPollTransport.LOOP_DELAY)

        expect(this.calledWithSeq).toBe(666)
        expect(this.transport.getLastMessageSequence()).toBe(667)
        expect(this.transportData).toHaveBeenCalledWith({test: "another response"})
      })

    })

    it("fails when server sends subscription failed", () => {
      xhrMock.mock((req, res) => {
        return res
          .status(400)
          .body(JSON.stringify({
            message: 'Subscription failed'
          }))
      })

      this.transport.connect()
      jasmine.clock().tick(10)

      expect(this.transportFailed).toHaveBeenCalled()
      expect(this.transportDisconnected).not.toHaveBeenCalled()
      expect(this.transportReconnecting).not.toHaveBeenCalled()
    })

    it("fails when browser connection fails", () => {
      xhrMock.mock((req, res) => {
        return null
      })

      this.transport.connect()
      jasmine.clock().tick(10)

      expect(this.transportFailed).toHaveBeenCalled()
      expect(this.transportDisconnected).not.toHaveBeenCalled()
      expect(this.transportReconnecting).not.toHaveBeenCalled()
    })
  })

  xit("reconnection")

  describe("connection closed", () => {
    beforeEach(() => {
      this.transportDisconnected = whenEventFired(this.transport, LongPollTransport.Event.Disconnected)
    })

    it("#disconnect fires disconnect event", () => {
      this.transport.disconnect()
      jasmine.clock().tick(10)

      expect(this.transportDisconnected).toHaveBeenCalled()
    })

    xit("stops long poll loop", () => {
    })

    xit("aborts existing request", () => {
    })
  })
})
