var chaos = require('../')
var db = chaos(__dirname + '/test-db')

var test = require('tap').test

var dnode = require('dnode')
var server
var remote, remote2

test("create dnode server", function (t) {
  t.plan(1)
  server = dnode(db.wrapper)
  server.listen(4000)
  server.on('ready', function () {
    t.pass("server ready")
  })
})

test("connect to dnode server", function (t) {
  t.plan(1)
  dnode.connect(4000, function (_remote) {
    t.pass("connected")
    remote = _remote
  })
})

test("connect 2 to dnode server", function (t) {
  t.plan(1)
  dnode.connect(4000, function (_remote) {
    t.pass("connected")
    remote2 = _remote
  })
})

test("remote.set('foo', 'bar')", function (t) {
  t.plan(1)
  remote.set('foo', 'bar', function (err) {
    t.equal(null, err)
  })
})

test("remote.get('foo')", function (t) {
  t.plan(1)
  remote.get('foo', function (err, val) {
    t.equal(val, 'bar')
  })
})

test("multiple incs edge case", function (t) {
  t.plan(1)
  var count = 100, total = count * 2
  for (var i = count; i--;) {
    setTimeout(function () {
      remote.inc('foo', function (err, val) {
        if (!--total) {
          t.equal(val, 200)
        }
      })
    }, Math.random() * 50 | 0)
    setTimeout(function () {
      remote2.inc('foo', function (err, val) {
        if (!--total) {
          t.equal(val, 200)
        }
      })
    }, Math.random() * 50 | 0)
  }
})

test("close server", function (t) {
  t.plan(1)
  server.end()
  server.close()
  t.pass("closed server")
})
