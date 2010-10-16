/*
 * chaos v0.0.3
 *
 * by stagas
 *
 */
 
var sys = require('sys')
  , fs = require('fs')
  , path = require('path')  
  , crypto = require('crypto')
  , EventEmitter = require('events').EventEmitter

// creationix's fast Queue
var Queue = function() {
  this.tail = [];
  this.head = Array.prototype.slice.call(arguments);
  this.offset = 0;
  // Lock the object down
  Object.seal(this);
}

Queue.prototype = {
  shift: function shift() {
    if (this.offset === this.head.length) {
      var tmp = this.head;
      tmp.length = 0;
      this.head = this.tail;
      this.tail = tmp;
      this.offset = 0;
      if (this.head.length === 0) return;
    }
    return this.head[this.offset++];
  },
  push: function push(item) {
    return this.tail.push(item);
  },
  get length() {
    return this.head.length - this.offset + this.tail.length;
  }
}
  
var Chaos = exports.Chaos = function(dbName) {
  if (!(this instanceof Chaos)) return new Chaos(dbName)
  var self = this
  
  this.version = 'v0.0.3'
  
  EventEmitter.call(this)
  
  this.dbName = dbName

  this.ready = false
  
  path.exists(this.dbName, function(exists) {
    if (!exists) {
      self._createDB(self.dbName)
    } else {
      self.ready = true
    }
  })
  
  this._hashAlgo = 'sha1'
  this._hashEnc = 'hex'
  
  this.maxOpenFiles = 30
  this._openFiles = 0

  this._writeQueue = new Queue()
  this._readQueue = new Queue()

  this._queued = false
  
  this.on('queue', function() {
    if (!self._queued) {
      self._queued = true
      self._drain()
    }
  })
}

sys.inherits(Chaos, EventEmitter)
Chaos.Chaos = Chaos
module.exports = Chaos

Chaos.prototype._createDB = function(dir) {
  var self = this
    , space = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f']
    , len = space.length
  
  console.log('** chaos: creating database, please wait...')
  sys.print('** finishes on 0, patience! : ')
  
  fs.mkdirSync(dir, 0777)
  for (var aa = len; aa--; ) {
    sys.print(space[aa])
    for (var ab = len; ab--; ) {
      fs.mkdirSync(dir +'/'+ space[aa]+space[ab], 0777)
      for (var ba = len; ba--; ) {
        for (var bb = len; bb--; ) {
          fs.mkdirSync(dir +'/'+ space[aa]+space[ab] +'/'+ space[ba]+space[bb], 0777)
        }
      }
    }
  }
  console.log(' : all done! db ready.')
  self.ready = true
}

Chaos.prototype._hash = function(key) {
  var hash = crypto.createHash(this._hashAlgo).update(key).digest(this._hashEnc)
  return {a: hash.substr(0,2), b: hash.substr(2,2), c: hash.substr(4)}
}

Chaos.prototype._queue = function(what, which, then) {
  this['_' + what + 'Queue'].push([which, then])
  
  this.emit('queue')
}

Chaos.prototype._drain = function() {
  var oper
  
  if (this._openFiles < this.maxOpenFiles) {
    if (this._writeQueue.length) {
      oper = this._writeQueue.shift()
      this._write(oper[0][0], oper[0][1], oper[1])
    }
    
    if (this._readQueue.length) {
      oper = this._readQueue.shift()
      this._read(oper[0], oper[1])
    }
  }

  if (this._writeQueue.length || this._readQueue.length) {
    var self = this
    
    process.nextTick(function() {
      self._drain()
    })
  } else {
    this._queued = false
  }
}

Chaos.prototype.set = function(key, val, cb) {
  this._queue('write', [key, val], cb)
}

Chaos.prototype.get = function(key, cb) {
  this._queue('read', key, cb)
}

Chaos.prototype._write = function(key, val, cb) {    
  var self = this
    , pos = this._hash(key)

  this._openFiles++
  
  fs.writeFile(self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c, val, 'utf8', function(err) {
    self._openFiles--
    
    cb(err)
  })
}

Chaos.prototype._read = function(key, cb) {
  var self = this
    , pos = this._hash(key)
    
  this._openFiles++
  
  fs.readFile(this.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c, function(err, data) {
    self._openFiles--
    
    cb(err, data)
  })
}
