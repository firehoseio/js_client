import { Server, WebSocket } from 'mock-socket';
import {EventEmitter} from 'events';
import WebSocketTransport from "../lib/web_socket_transport"

const whenEventFired = (item: EventEmitter, event:string) => {
  let handler = jasmine.createSpy(event)
  item.on(event, handler)
  return handler
}

describe("WebSocketTransport", () => {

  beforeEach(() => {
    this.server = new Server('wss://localhost:8080')

    this.setupSuccessfulConnection = () => {
      this.transport = new WebSocketTransport("localhost:8080")
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
    this.server.stop()
    if(this.transport) {
      this.transport.disconnect()
    }

    jasmine.clock().uninstall()
  })

  describe("PING / PONG", () => {
    beforeEach(() => {
      this.transport = new WebSocketTransport("localhost:8080")
      this.connectingHandler = whenEventFired(this.transport, WebSocketTransport.Event.Connecting)
      this.connectedHandler = whenEventFired(this.transport, WebSocketTransport.Event.Connected)
      this.transport.connect()
    })

    it("sends ping on connection", (end) => {
      this.server.on('message', data => {
        data = JSON.parse(data)
        expect( data.ping ).toBe("PING")
        end()
      })
      jasmine.clock().tick(10)
    })

    it("waits for PONG before being connected", () => {
      jasmine.clock().tick(10)
      expect(this.connectingHandler).toHaveBeenCalled()
      expect(this.connectedHandler).not.toHaveBeenCalled()
      this.server.send(`{"pong": "PONG"}`)
      jasmine.clock().tick(10)
      expect(this.connectedHandler).toHaveBeenCalled()
    })

    describe("keepalive", () => {
      beforeEach(() => {
        this.pingsRecieved = 0
        this.server.on('message', data => {
          data = JSON.parse(data)
          if(data.ping) this.pingsRecieved += 1
        })
        jasmine.clock().tick(10)
        this.server.send(`{"pong": "PONG"}`)
      })

      it("pings every 20s when quiet", () => {
        jasmine.clock().tick(10)
        expect(this.pingsRecieved).toBe(1)
        jasmine.clock().tick(20000)
        expect(this.pingsRecieved).toBe(2)
        jasmine.clock().tick(10000)
        expect(this.pingsRecieved).toBe(2)
        jasmine.clock().tick(10000)
        expect(this.pingsRecieved).toBe(3)
      })

      it("pings 20s after message", () => {
        jasmine.clock().tick(10)
        expect(this.pingsRecieved).toBe(1)
        jasmine.clock().tick(10000)
        expect(this.pingsRecieved).toBe(1)
        this.server.send(`{"hello": "client"}`)
        jasmine.clock().tick(10) //Server has a built in 4ms delay
        jasmine.clock().tick(10000)
        expect(this.pingsRecieved).toBe(1)
        jasmine.clock().tick(10000)
        expect(this.pingsRecieved).toBe(2)
        jasmine.clock().tick(20000)
        expect(this.pingsRecieved).toBe(3)
      })
    })
  })

  describe("#sendStartingMessageSequence", () => {
    it("sends on the message sequence to the server", (end) => {
      this.server.on('message', data => {
        data = JSON.parse(data)
        if(data.ping) return
        expect( data.message_sequence ).toBe(10)
        end()
      });
      this.setupSuccessfulConnection()
    })
  })

  describe("connection closed", () => {
    beforeEach(() => {
      this.setupSuccessfulConnection()
      this.serverClosed = whenEventFired(this.server, "close")
      this.transportClosed = whenEventFired(this.transport, WebSocketTransport.Event.Closed)
      this.transportDisconnected = whenEventFired(this.transport, WebSocketTransport.Event.Disconnected)
      this.transportFailed = whenEventFired(this.transport, WebSocketTransport.Event.Failed)
    })

    it("#disconnect closes the server connection", () => {
      this.transport.disconnect()
      jasmine.clock().tick(10)

      expect(this.serverClosed).toHaveBeenCalled()
      expect(this.transportClosed).toHaveBeenCalled()
      expect(this.transportDisconnected).toHaveBeenCalled()
      expect(this.transportFailed).not.toHaveBeenCalled()
    })

    it("server clean close closed the local version", () => {
      this.server.close({wasClean: true})
      jasmine.clock().tick(10)

      expect(this.transportClosed).toHaveBeenCalled()
      expect(this.transportDisconnected).toHaveBeenCalled()
      expect(this.transportFailed).not.toHaveBeenCalled()
    })

    it("server dirty close closed the local version", () => {
      this.server.close({wasClean: false, code: 666})
      jasmine.clock().tick(10)

      expect(this.transportClosed).toHaveBeenCalled()
      expect(this.transportDisconnected).toHaveBeenCalled()
      expect(this.transportFailed).not.toHaveBeenCalled()
    })
  })

  xdescribe("reconnection", () => {
    pending("To be implemented")
  })

  xdescribe("subscription failed message", () => {
    pending("To be implemented")
  })
})
