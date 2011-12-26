var chaos = require('../')
var db = chaos(__dirname + '/test-db')

var test = require('tap').test

test("set('foo', 'bar')", function (t) {
  t.plan(1)
  db.set('foo', 'bar', function (err) {
    t.equal(err, null)
  })
})

test("get('foo')", function (t) {
  t.plan(1)
  db.get('foo', function (err, data) {
    t.equal(data, 'bar')
  })
})

test("del('foo')", function (t) {
  t.plan(1)
  db.del('foo', function (err) {
    t.equal(err, null)
  })
})

test("inc('foo')", function (t) {
  t.plan(1)
  db.inc('foo', function (err, val) {
    t.equal(val, 1)
  })
})

test("inc('foo')", function (t) {
  t.plan(1)
  db.inc('foo', function (err, val) {
    t.equal(val, 2)
  })
})

test("dec('foo')", function (t) {
  t.plan(1)
  db.dec('foo', function (err, val) {
    t.equal(val, 1)
  })
})

test("dec('foo')", function (t) {
  t.plan(1)
  db.dec('foo', function (err, val) {
    t.equal(val, 0)
  })
})

test("inc('foo') x 100 edge case", function (t) {
  t.plan(1)
  var count = 100
  for (var i = count; i--; ) {
    db.inc('foo', function (err, val) {
      if (!--count) {
        t.equal(val, 100)
      }
    })
  }
})

test("dec('foo') x 50 edge case", function (t) {
  t.plan(1)
  var count = 50
  for (var i = count; i--; ) {
    db.dec('foo', function (err, val) {
      if (!--count) {
        t.equal(val, 50)
      }
    })
  }
})

test("multi()", function (t) {
  t.plan(1)
  db.del('foobar')
  db.multi(function (m, done) {
    m.inc('foo')
    m.inc('foo')
    m.get('foo', function (err, val) {
      m.set('foobar', val, function (err) {
        done()
      })
    })
  })
  db.get('foobar', function (err, data) {
    t.equal(data, 52)
  })
})

test("push('foo', 'bar')", function (t) {
  t.plan(1)
  db.push('foo', 'bar', function (err, arr) {
    t.deepEqual([ 'bar' ], arr)
  })
})

test("push('foo', 'zoo')", function (t) {
  t.plan(1)
  db.push('foo', 'zoo', function (err, arr) {
    t.deepEqual([ 'bar', 'zoo' ], arr)
  })
})

test("unshift('foo', 'baz')", function (t) {
  t.plan(1)
  db.unshift('foo', 'baz', function (err, arr) {
    t.deepEqual([ 'baz', 'bar', 'zoo' ], arr)
  })
})

test("pop('foo')", function (t) {
  t.plan(2)
  db.pop('foo', function (err, arr, el) {
    t.deepEqual([ 'baz', 'bar' ], arr)
    t.equal(el, 'zoo')
  })
})

test("shift('foo')", function (t) {
  t.plan(2)
  db.shift('foo', function (err, arr, el) {
    t.deepEqual([ 'bar' ], arr)
    t.equal(el, 'baz')
  })
})

test("multiple push('foo') edge case", function (t) {
  t.plan(1)
  var count = 10
  for (var i = count; i--;) {
    db.push('foo', i, function (err, arr) {
      if (!--count) {
        t.deepEqual([ 'bar', 9, 8, 7, 6, 5, 4, 3, 2, 1, 0 ], arr)
      }
    })
  }
})
