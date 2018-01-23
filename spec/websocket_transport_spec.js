import WebSocketTransport from "../lib/web_socket_transport.js"

describe('WebSocketTransport', function() {
  beforeEach(function() {
    this.klass    = WebSocketTransport;
    this.instance = new this.klass({uri: 'ws://localhost/test'});
  });

  //= Specs ===

  it('.name returns a string',         function() { expect( this.instance.name() ).toEqual(jasmine.any(String)); });
  it('.ieSupported returns a Boolean', function() { expect( typeof this.klass.ieSupported() ).toBe('boolean'); });
  it('.supported returns a Boolean',   function() { expect( typeof this.klass.supported()   ).toBe('boolean'); });

  describe('callbacks', () =>
    ['_request','_open','_close','_error'].map((callback) =>
      it(`has a ${callback} callback function`, function() {
        expect( this.instance[callback] ).toEqual(jasmine.any(Function));
      }))
  );

  describe('#stop', function() {
    beforeEach(function() {
      // call _request directly so we don't have to wait for the setTimeout
      // call to call _request in the next event loop iteration
      this.instance._request();
      spyOn(this.instance.socket, 'close')
      Object.freeze(this.instance);
    }); // stop _cleanUp method deleting the socket

    afterEach(function () {
      this.instance.socket.close.calls.reset()
    })

    it('closes the socket', function() {
      this.instance.stop();
      expect( this.instance.socket.close).toHaveBeenCalled()
    });
  });
});
