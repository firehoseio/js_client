import Transport from "../lib/transport.js"

describe('Transport', function() {
  beforeEach(function() {
    this.klass    = Transport;
    this.instance = new this.klass();
  });

  it('.supported returns false', function() { expect( this.klass.supported() ).toBe(false); });
  it('.name throws error',       () => expect( function() { this.instance.name;   }).toThrow());
  it('.stop throws error',       () => expect( function() { this.instance.stop;   }).toThrow());

  describe('constructor', function() {
    it('returns an instance',     function() { expect( this.instance             ).toEqual(jasmine.any(this.klass)); });
    it('sets the @config object', function() { expect( this.instance.config      ).toEqual(jasmine.any(Object)); });
    it('sets a retry delay',      function() { expect( this.instance._retryDelay ).toEqual(jasmine.any(Number)); });
  });

  describe('#connect', () => {
    describe('when given a 500 delay', function() {
      beforeEach(function() {
        jasmine.clock().install()
        spyOn(this.instance, '_request')
        this.instance.connect(500);
      });

      afterEach(function() {
        jasmine.clock().uninstall()
        this.instance._request.calls.reset()
      })

      it('does not call _request before the given delay', function() {
        jasmine.clock().tick(499)
        expect( this.instance._request ).not.toHaveBeenCalled()
      });

      it('calls _request after the given delay', function() {
        jasmine.clock().tick(600)
        expect( this.instance._request ).toHaveBeenCalled()
      });
    })

    describe('when given a -1` delay', function() {
      beforeEach(function() {
        spyOn(this.instance, '_request')
        this.instance.connect(-1);
      })

      afterEach(function() {
        this.instance._request.calls.reset()
      })

      it('calls _request immediately', function() {
        expect(this.instance._request).toHaveBeenCalled()
      })
    })
  });
});
