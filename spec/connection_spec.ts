import {EventEmitter} from 'events';
import * as wst from '../lib/web_socket_transport';
import * as lpt from '../lib/long_poll_transport';
import Connection from "../lib/connection"

const whenEventFired = (item: EventEmitter, event:string) => {
  let handler = jasmine.createSpy(event)
  item.on(event, handler)
  return handler
}

function stubTransport(self, type, supported = true) {
  let theImport:any = type == "lpt" ? lpt : wst;

  let original = theImport.default

  self[type] = {
    reset: () => {
      theImport.default = original
    }
  }

  theImport.default = (uri, options) => {
    self[type].uri = uri
    self[type].options = options

    return self[type].methods = jasmine.createSpyObj(type, [
      "connect",
      "disconnect",
      "getLastMessageSequence",
      "once",
      "sendStartingMessageSequence"
    ])
  }

  self[type].supported = jasmine.createSpy(`${type}-supported`).and.returnValue(supported)
  theImport.default.supported = self[type].supported

  theImport.default.Event = original.Event
}

function findHandler(spy, event) {
  let ret = null

  spy.calls.allArgs().forEach((args) => {
    if(args[0] == event) ret = args[1]
  });

  return ret
}

describe("Connection", () => {

  beforeEach(() => {
    stubTransport(this, "lpt")
    stubTransport(this, "wst")

    jasmine.clock().install()

    this.conn = new Connection("example.com", {
      longPollTimeout: 20000,
      retryDelay: 2000
    })
    this.promise = this.conn.connect()
    jasmine.clock().tick(10)
  })

  afterEach(() => {
    this.lpt.reset()
    this.wst.reset()
    this.conn.disconnect()
    jasmine.clock().uninstall()
  })

  describe("#connect", () => {
    it("starts connecting via long poll", () => {
      expect(this.lpt.uri).toBe("example.com")
      expect(this.lpt.options).toEqual(jasmine.objectContaining({
        longPollTimeout: 20000,
        retryDelay: 2000,
        parse: JSON.parse
      }));
      expect(this.lpt.methods.connect).toHaveBeenCalled()
    })

    it("returns a promise that resolves on connect", (end) => {
      this.promise.then(() => {
        expect("promise resolved").toBeTruthy()
        end()
      })

      findHandler(this.lpt.methods.once, lpt.default.Event.Connected)()
    })

    it("returns a promise that rejects on failed", (end) => {
      this.promise.catch(() => {
        expect("promise rejected").toBeTruthy()
        end()
      })

      findHandler(this.lpt.methods.once, lpt.default.Event.Failed)()
    })

    it("tries to connect to websocket after 500ms for upgrade", () => {
      expect(this.wst.uri).toBeUndefined()

      jasmine.clock().tick(500)

      expect(this.wst.uri).toBe("example.com")
      expect(this.wst.options).toEqual(jasmine.objectContaining({
        retryDelay: 2000,
        parse: JSON.parse
      }));
      expect(this.wst.methods.connect).toHaveBeenCalled()
    })
  })

  describe("#disconnect", () => {
    it("doesn't try to upgrade to websockets if disconnected within 500ms", () => {
      jasmine.clock().tick(450)
      this.conn.disconnect()
      expect(this.lpt.methods.disconnect).toHaveBeenCalled()
      expect(this.wst.uri).toBeUndefined()
      jasmine.clock().tick(100)
      expect(this.wst.uri).toBeUndefined()
    })

    it("disconnects websocket upgrade if not completed", () => {
      jasmine.clock().tick(500)
      this.conn.disconnect()
      expect(this.lpt.methods.disconnect).toHaveBeenCalled()
      expect(this.wst.methods.disconnect).toHaveBeenCalled()
    })

    it("disconnects websocket if upgraded", () => {
      jasmine.clock().tick(500)
      findHandler(this.wst.methods.once, wst.default.Event.Connected)()
      expect(this.lpt.methods.disconnect).toHaveBeenCalled()
      expect(this.wst.methods.disconnect).not.toHaveBeenCalled()
      this.conn.disconnect()
      expect(this.wst.methods.disconnect).toHaveBeenCalled()
    })
  })

  describe("upgrade", () => {
    it("disconnects long poll when connected", () => {
      expect(this.lpt.methods.disconnect).not.toHaveBeenCalled()
      jasmine.clock().tick(500)
      findHandler(this.wst.methods.once, wst.default.Event.Connected)()
      expect(this.lpt.methods.disconnect).toHaveBeenCalled()
    })

    it("passes on the last message seq from long poll", () => {
      jasmine.clock().tick(500)
      this.lpt.methods.getLastMessageSequence.and.returnValue(666)
      findHandler(this.wst.methods.once, wst.default.Event.Connected)()
      expect(this.wst.methods.sendStartingMessageSequence).toHaveBeenCalledWith(666)
    })
  })

  xdescribe("#getState", () => {
    // To be implemented
  })

  xdescribe("#getType", () => {
    // To be implemented
  })

})
