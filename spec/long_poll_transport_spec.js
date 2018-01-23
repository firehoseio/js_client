import LongPollTransport from "../lib/long_poll_transport.js"

describe('LongPollTransport', function() {
  beforeEach(function() {
    this.klass    = LongPollTransport;
    this.instance = new this.klass();
  });

  afterEach(function() { this.instance.stop(); });

  //= Specs ===

  it('.ieSupported returns a Boolean', function() {
    expect( typeof this.klass.ieSupported() ).toBe('boolean');
  });

  it('.supported returns a Boolean', function() {
    expect( typeof this.klass.supported() ).toBe('boolean');
  });

  describe('#stop', function() {
    beforeEach(function() {
      this.spyTest = jasmine.createSpy('spy')
      this.instance._lastRequest     = $.ajax();
      this.instance._lastPingRequest = $.ajax();
    });

    afterEach(function() {
      this.spyTest.calls.reset()
    })

    it('aborts the last request', function() {
      spyOn(this.instance._lastRequest, 'abort').and.callFake(this.spyTest)
      expect(this.spyTest).not.toHaveBeenCalled()
      this.instance.stop();
      expect(this.spyTest).toHaveBeenCalled()
    });

    it('deletes reference to the last request', function() {
      this.instance.stop();
      expect( this.instance._lastRequest != null ).toBe(false);
    });

    it('aborts the last ping request', function() {
      spyOn(this.instance._lastPingRequest, 'abort').and.callFake(this.spyTest)
      expect(this.spyTest).not.toHaveBeenCalled()
      this.instance.stop();
      expect(this.spyTest).toHaveBeenCalled()
    });

    it('deletes reference to the last ping request', function() {
      this.instance.stop();
      expect( this.instance._lastPingRequest != null ).toBe(false);
    });
  });

  describe('callbacks', () =>
    ['_request','_success','_ping','_error'].map((callback) =>
      it(`has a ${callback} callback function`, function() {
        expect( this.instance[callback] ).toEqual(jasmine.any(Function));
      }))
  );
});
