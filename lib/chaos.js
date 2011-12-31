/*
 * chaos v0.3.0
 */

var version = '0.3.0'

var fs = require('fs')
var path = require('path')
var crypto = require('crypto')
var atomic = require('atomic')
var mkdirp = require('mkdirp')

// Reference to slice

var slice = [].slice

// Utilities

var utils = {}
utils.hash = function (s) {
  return crypto.createHash('sha1').update(s.toString()).digest('hex')
}

// Chaos Constructor (database_path)

var Chaos = function (dbpath) {
  if (!(this instanceof Chaos)) return new Chaos(dbpath)
  var self = this
  this.atomic = atomic()
  this.path = dbpath
  mkdirp.sync(dbpath, 0755)
  this.root = function (filename) {
    return path.join(dbpath, filename)
  }
  this.wrapper = {}
  Object.keys(this)
    .concat(Object.keys(this.__proto__))
    .forEach(function (method) {
    if (method != 'wrapper') {
      self.wrapper[method] = self[method]
    }
  })
}

// Multi Transaction Constructor (parent_object)

var Multi = function (parent) {
  this.parent = parent
}

// Transaction function

Chaos.prototype.tx = function (callback) {
  this.atomic('tx', callback)
}

// Multi transaction function

Chaos.prototype.multi = function (callback) {
  var self = this
  self.tx(function (done) {
    callback(new Multi(self), done)
  })
}

// Commands:

// set ( key, val, callback (err) )

Chaos.prototype._set = function (key, val, callback) {
  var filename = this.root(key)
  fs.writeFile(filename, JSON.stringify(val), callback)
}

// get ( key, callback (err, val) )

Chaos.prototype._get = function (key, callback) {
  var filename = this.root(key)
  fs.readFile(filename, function (err, data) {
    if (err) return callback(err)
    try { data = JSON.parse(data) }
    catch (e) { return callback(e) }
    callback(null, data)
  })
}

// del ( key, callback (err) )

Chaos.prototype._del = function (key, callback) {
  var filename = this.root(key)
  fs.unlink(filename, callback)
}
Chaos.prototype._remove = Chaos.prototype._del

// inc ( key, callback (err, incremented_val) )

Chaos.prototype._inc = function (key, amount, callback) {
  var self = this
  if ('number' != typeof amount) callback = amount, amount = 1
  self._get(key, function (err, val) {
    if (err || !val || 'number' != typeof val) val = 0
    val += amount
    self._set(key, val, function (err) {
      callback(err, val)
    })
  })
}
Chaos.prototype._incr = Chaos.prototype._inc

// dec ( key, callback (err, decremented_val) )

Chaos.prototype._dec = function (key, amount, callback) {
  var self = this
  if ('number' != typeof amount) callback = amount, amount = 1
  self._get(key, function (err, val) {
    if (err || !val || 'number' != typeof val) val = 0
    val -= amount
    self._set(key, val, function (err) {
      callback(err, val)
    })
  })
}
Chaos.prototype._decr = Chaos.prototype._dec

;[ 'push', 'unshift', 'pop', 'shift' ]
.forEach(function (method) {
  Chaos.prototype['_' + method] = function (key, val, callback) {
    var self = this
    if ('function' == typeof val) callback = val, val = undefined
    self._get(key, function (err, arr) {
      if (!Array.isArray(arr)) arr = []
      var retval = arr[method](val)
      self._set(key, arr, function (err) {
        callback(err, arr, retval)
      })
    })
  }
})

// Mount methods

;

[ 'set', 'get', 'del', 'remove'
, 'inc', 'incr', 'dec', 'decr'
, 'push', 'unshift', 'pop', 'shift'
]

.forEach(function (method) {
  Chaos.prototype[method] = function () {
    var db = this
    var args = slice.call(arguments)
    var key = args[0] = utils.hash(args[0])
    var callback = 'function' == typeof args[args.length - 1]
      ? args.pop()
      : function () {}
    db.tx(function (txdone) {
      db.atomic(key, function (done) {
        args.push(function () {
          done()
          txdone()
          callback.apply(this, arguments)
        })
        db['_' + method].apply(db, args)
      })
    })
  }
  Multi.prototype[method] = function () {
    var db = this.parent
    var args = slice.call(arguments)
    var key = args[0] = utils.hash(args[0])
    var callback = 'function' == typeof args[args.length - 1]
      ? args.pop()
      : function () {}
    db.atomic(key, function (done) {
      args.push(function () {
        done()
        callback.apply(this, arguments)
      })
      db['_' + method].apply(db, args)
    })
  }
})

// Export Chaos

exports = module.exports = Chaos
exports.version = version
exports.connect = function (port, callback) {
  if ('function' == typeof port) callback = port, port = 5646
  var dnode = require('dnode')
  dnode.connect(port, callback)
}
