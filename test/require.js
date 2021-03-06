var createAppWithMiddleware = require('./fixtures/createAppWithMiddleware');
var mw = require('../index');
var createCounter = require('callback-count');
var request = require('./lib/superdupertest');
var keypather = require('keypather')();
var values = function (obj) {
  return Object.keys(obj).map(function (key) {
    return obj[key];
  });
};

describe('require', function () {
  describe('mw.body(key).require()', requireKey('body'));
  describe('mw.query(key).require()', requireKey('query'));
  describe('mw.params(key).require()', requireKey('params'));

  describe('mw.body(keypath).require()', requireKeypath('body', 'foo.bar.baz'));

  describe('mw.body(keys...).require()', requireKeys('body'));
  describe('mw.query(keys...).require()', requireKeys('query'));
  describe('mw.params(keys...).require()', requireKeys('params'));

  describe('mw.body({ or: [keys...] }).require()', requireKeysOr('body'));
  describe('mw.query({ or: [keys...] }).require()', requireKeysOr('query'));
  describe('mw.params({ or: [keys...] }).require()', requireKeysOr('params'));
});

function requireKey (dataType) {
  return function () {
    before(function () {
      this.key = 'key1';
      this.app = createAppWithMiddleware(mw[dataType](this.key).require());
    });
    it('should error if required key not included', function (done) {
      var body = {};
      var query = {};
      var params = values({});
      request(this.app)
        .post('/'+dataType, params, query)
        .send(body)
        .expect(400)
        .expect(function (res) {
          res.body.message.should.match(/required/);
        })
        .end(done);
    });
    it('should succeed if required key included', function (done) {
      var data = {};
      data[this.key] = 'value';
      var body = dataType === 'body' ? data : {};
      var query = dataType === 'query' ? data : {};
      var params = dataType === 'params' ? values(data) : [];
      request(this.app)
        .post('/'+dataType, params, query)
        .send(data)
        .expect(200, data)
        .end(done);
    });
  };
}

function requireKeypath (dataType, keypath) {
  return function () {
    before(function () {
      this.keypath = keypath;
      this.app = createAppWithMiddleware(mw[dataType](this.keypath).require());
    });
    it('should error if required key not included', function (done) {
      var body = {};
      var query = {};
      var params = values({});
      request(this.app)
        .post('/'+dataType, params, query)
        .send(body)
        .expect(400)
        .expect(function (res) {
          res.body.message.should.match(/required/);
        })
        .end(done);
    });
    it('should succeed if required key included', function (done) {
      var data = {};
      keypather.set(data, this.keypath, 'value');
      var body = dataType === 'body' ? data : {};
      var query = dataType === 'query' ? data : {};
      var params = dataType === 'params' ? values(data) : [];
      request(this.app)
        .post('/'+dataType, params, query)
        .send(data)
        .expect(200, data)
        .end(done);
    });
  };
}

function requireKeys (dataType) {
  return function () {
    before(function () {
      var keys = this.keys = ['key1', 'key2'];
      this.app = createAppWithMiddleware(mw[dataType](keys[0], keys[1]).require());
    });
    it('should error if all keys are not included', function (done) {
      var keys = this.keys;
      var body = {};
      var query = {};
      var params = values({});
      request(this.app)
        .post('/'+dataType, params, query)
        .send(body)
        .expect(400)
        .expect(function (res) {
          res.body.message.should.match(new RegExp(keys[0]));
          res.body.message.should.match(/required/);
        })
        .end(done);
    });
    it('should error if one key required is not included', function (done) {
      var keys = this.keys;
      var count = createCounter(done);
      var data1 = {};
      data1[keys[0]] = 'value1';
      var body1 = dataType === 'body' ? data1 : {};
      var query1 = dataType === 'query' ? data1 : {};
      var params1 = dataType === 'params' ? values(data1) : [];
      request(this.app)
        .post('/'+dataType, params1, query1)
        .send(body1)
        .expect(400)
        .expect(function (res) {
          res.body.message.should.match(new RegExp(keys[1]));
          res.body.message.should.match(/required/);
        })
        .end(count.inc().next);
      if (dataType !== 'params') { // not possible for params to have middle param missing
        var data2 = {};
        data2[keys[1]] = 'value2';
        var body2 = dataType === 'body' ? data2 : {};
        var query2 = dataType === 'query' ? data2 : {};
        request(this.app)
          .post('/'+dataType, query2)
          .send(body2)
          .expect(400)
          .expect(function (res) {
            res.body.message.should.match(new RegExp(keys[0]));
            res.body.message.should.match(/required/);
          })
          .end(count.inc().next);
      }
    });
    it('should succeed if required key included', function (done) {
      var keys = this.keys;
      var data = {};
      data[keys[0]] = 'value1';
      data[keys[1]] = 'value2';
      var body = dataType === 'body' ? data : {};
      var query = dataType === 'query' ? data : {};
      var params = dataType === 'params' ? values(data) : [];
      request(this.app)
        .post('/'+dataType, params, query)
        .send(body)
        .expect(200, data)
        .end(done);
    });
  };
}

function requireKeysOr (dataType) {
  return function () {
    before(function () {
      var keys = this.keys = ['key1', 'key2'];
      this.app = createAppWithMiddleware(mw[dataType]({ or: [keys[0], keys[1]] }).require());
    });
    it('should error if all keys are not included', function (done) {
      var keys = this.keys;
      var body = {};
      var query = {};
      var params = values({});
      request(this.app)
        .post('/'+dataType, params, query)
        .send(body)
        .expect(400)
        .expect(function (res) {
          keys.forEach(function (key) {
            res.body.message.should.match(new RegExp(key));
          });
          res.body.message.should.match(/required/);
        })
        .end(done);
    });
    it('should pass if one required key is included', function (done) {
      var keys = this.keys;
      var count = createCounter(done);
      var data1 = {};
      data1[keys[0]] = 'value1';
      var body1 = dataType === 'body' ? data1 : {};
      var query1 = dataType === 'query' ? data1 : {};
      var params1 = dataType === 'params' ? values(data1) : [];
      request(this.app)
        .post('/'+dataType, params1, query1)
        .send(body1)
        .expect(200)
        .end(count.inc().next);
      if (dataType !== 'params') { // not possible for params to have middle param missing
        var data2 = {};
        data2[keys[1]] = 'value2';
        var body2 = dataType === 'body' ? data2 : {};
        var query2 = dataType === 'query' ? data2 : {};
        request(this.app)
          .post('/'+dataType, query2)
          .send(body2)
          .expect(200)
          .end(count.inc().next);
      }
    });
  };
}