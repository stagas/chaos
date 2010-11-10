/*
 * chaos v0.1.3
 *
 * by stagas
 *
 */
 
var sys
  , fs = require('fs')
  , path = require('path')  
  , crypto = require('crypto')
  , EventEmitter = require('events').EventEmitter

try {
  sys = require('util')
} catch (err) {
  sys = require('sys')
}

var VALID_FILENAME = new RegExp('([^a-zA-Z0-9 ])', 'g')

// to_array from mranney / node_redis
function to_array(args) {
    var len = args.length,
        arr = new Array(len), i;

    for (i = 0; i < len; i += 1) {
        arr[i] = args[i];
    }

    return arr;
}

// creationix's fast Queue
var Queue = function() {
  this.tail = [];
  this.head = to_array(arguments);
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
  
  this.version = 'v0.1.3'
  
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

  this._queue_ = new Queue()
  this._queued = false

  this._busy = {}
  
  this.on('queue', function() {
    if (!self._queued) {
      self._queued = true
      self._flush()
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
        fs.mkdirSync(dir +'/'+ space[aa]+space[ab] +'/'+ space[ba], 0777)
      }
    }
  }
  console.log(' : all done! db ready.')
  self.ready = true
}

Chaos.prototype._hash = function(key) {
  var hash = crypto.createHash(this._hashAlgo).update(key).digest(this._hashEnc)
  return {a: hash.substr(0,2), b: hash.substr(2,1), c: hash.substr(3), hash: hash}
}

Chaos.prototype._queue = function(a, b) {
  this._queue_.push([a, b])
  
  this.emit('queue')
}

Chaos.prototype._flush = function() {
  var oper
  
  if (this._queue_.length) {
    if (this.ready && this._openFiles < this.maxOpenFiles) {
      oper = this._queue_.shift()
      this[oper[0]].apply(this, oper[1])
    }

    var self = this
    
    process.nextTick(function() {
      self._flush()
    })
  } else {
    this._queued = false
  }
}


// COMMANDS

Chaos.prototype._set = function(key, val, cb) {
  if (typeof this._busy[key] != 'undefined') return this.set(key, val, cb)

  var self = this
    , pos = this._hash(key)
    , filename = self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c
  
  if (typeof val != 'string') val = val.toString()

  this._openFiles++
  this._busy[key] = true
  
  fs.writeFile(filename, val, 'utf8', function(err) {
    self._openFiles--
    delete self._busy[key]

    if (cb) cb(err)
  })
}

Chaos.prototype._get = function(key, cb) {
  if (typeof this._busy[key] != 'undefined') return this.get(key, cb)

  var self = this
    , pos = this._hash(key)
    , filename = self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c
  
  this._openFiles++
  this._busy[key] = true

  fs.readFile(filename, 'utf8', function(err, data) {
    self._openFiles--
    delete self._busy[key]
    
    if (cb) cb(err, data)
  })
}

Chaos.prototype._del = function(key, cb) {
  if (typeof this._busy[key] != 'undefined') return this.del(key, cb)

  var self = this
    , pos = this._hash(key)
    , filename = self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c

  this._openFiles++
  this._busy[key] = true

  fs.stat(filename, function(err, stats) {
    if (err) {
      self._openFiles--
      delete self._busy[key]
    
      if (cb) cb(err)
      return
    }
    if (stats.isFile()) {
      fs.unlink(filename, function(err) {
        self._openFiles--
        delete self._busy[key]
      
        if (cb) cb(err)
      })
    } else if (stats.isDirectory()) {
      fs.rmdir(filename, function(err) {
        self._openFiles--
        delete self._busy[key]
        
        if (cb) cb(err)
      })
    } else {
      self._openFiles--
      delete self._busy[key]
    
      if (cb) cb(err)
    }
  })
}

Chaos.prototype._getset = function(key, val, cb) {
  if (typeof this._busy[key] != 'undefined') return this.getset(key, val, cb)

  var self = this
    , pos = this._hash(key)
    , filename = self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c
  
  this._openFiles++
  this._busy[key] = true

  fs.readFile(filename, 'utf8', function(err, data) {
    if (typeof val != 'string') val = val.toString()
  
    fs.writeFile(filename, val, 'utf8', function(err) {
      self._openFiles--
      delete self._busy[key]
    
      if (cb) cb(err, data)
    })
  })
}

Chaos.prototype._getdel = function(key, cb) {
  if (typeof this._busy[key] != 'undefined') return this.getdel(key, cb)

  var self = this
    , pos = this._hash(key)
    , filename = self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c
  
  this._openFiles++
  this._busy[key] = true
  
  fs.readFile(filename, function(err, data) {
    fs.unlink(filename, function(err) {
      self._openFiles--
      delete self._busy[key]
    
      if (cb) cb(err, data)
    })
  })
}

Chaos.prototype._getorsetget = function(key, val, cb) {
  if (typeof this._busy[key] != 'undefined') return this.getorsetget(key, val, cb)

  var self = this
    , pos = this._hash(key)
    , filename = self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c
  
  this._openFiles++
  this._busy[key] = true
  
  fs.readFile(filename, 'utf8', function(err, data) {
    if (err) {
      if (typeof val != 'string') val = val.toString()

      fs.writeFile(filename, val, 'utf8', function(err) {
        self._openFiles--
        delete self._busy[key]
      
        if (cb) cb(err, val)
      })
    } else {
      self._openFiles--
      delete self._busy[key]
    
      if (cb) cb(err, data)
    }
  })
}

Chaos.prototype._incr = function(key, cb) {
  if (typeof this._busy[key] != 'undefined') return this.incr(key, cb)
  
  var self = this
    , pos = this._hash(key)
    , filename = self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c

  this._openFiles++
  this._busy[key] = true

  var num = 0
  fs.readFile(filename, 'utf8', function(err, data) {
    if (!err) {
      num = parseInt(data, 10)
      if (isNaN(num)) num = 0
    }
    
    num++
    
    fs.writeFile(filename, num.toString(), 'utf8', function(err) {
      self._openFiles--
      delete self._busy[key]
      
      if (cb) cb(err, num)
    })
  })
}

Chaos.prototype._decr = function(key, cb) {
  if (typeof this._busy[key] != 'undefined') return this.decr(key, cb)
  
  var self = this
    , pos = this._hash(key)
    , filename = self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c

  this._openFiles++
  this._busy[key] = true

  var num = 0
  fs.readFile(filename, 'utf8', function(err, data) {
    if (!err) {
      num = parseInt(data, 10)
      if (isNaN(num)) num = 0
    }
    
    num--
    
    fs.writeFile(filename, num.toString(), 'utf8', function(err) {
      self._openFiles--
      delete self._busy[key]
      
      if (cb) cb(err, num)
    })
  })
}

Chaos.prototype._hset = function(key, field, val, cb) {
  if (typeof this._busy[key] != 'undefined') return this.hset(key, field, val, cb)
  
  var self = this
    , pos = this._hash(key)
    , dirname = self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c
    , filename = field.replace(VALID_FILENAME, '')

  if (filename.length == 0) {
    if (cb) cb(new Error('Invalid field name (must be [a-zA-Z0-9 ]): ' + field))
    return
  }

  if (typeof val != 'string') val = val.toString()
  
  filename = dirname +'/'+ filename

  this._openFiles++
  this._busy[key] = true
  
  fs.mkdir(dirname, 0777, function(err) {
    fs.writeFile(filename, val, 'utf8', function(err) {
      self._openFiles--
      delete self._busy[key]
      
      if (cb) cb(err)
    })
  })
}

Chaos.prototype._hget = function(key, field, cb) {
  if (typeof this._busy[key] != 'undefined') return this.hget(key, field, cb)
  
  var self = this
    , pos = this._hash(key)
    , dirname = self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c
    , filename = field.replace(VALID_FILENAME, '')

  if (filename.length == 0) {
    if (cb) cb(new Error('Invalid field name (must be [a-zA-Z0-9 ]): ' + field))
    return
  }
  
  filename = dirname +'/'+ filename

  this._openFiles++
  this._busy[key] = true
  
  fs.readFile(filename, 'utf8', function(err, data) {
    self._openFiles--
    delete self._busy[key]
    
    if (cb) cb(err, data)
  })
}

Chaos.prototype._hdel = function(key, field, cb) {
  if (typeof this._busy[key] != 'undefined') return this.hdel(key, field, cb)

  var self = this
    , pos = this._hash(key)
    , dirname = self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c
    , filename = field.replace(VALID_FILENAME, '')

  if (filename.length == 0) {
    if (cb) cb(new Error('Invalid field name (must be [a-zA-Z0-9 ]): ' + field))
    return
  }

  filename = dirname +'/'+ filename
  
  this._openFiles++
  this._busy[key] = true

  fs.unlink(filename, function(err) {
    self._openFiles--
    delete self._busy[key]
    
    if (cb) cb(err)
  })
}

Chaos.prototype._hgetall = function(key, cb) {
  if (typeof this._busy[key] != 'undefined') return this.hgetall(key, cb)
  
  var self = this
    , pos = this._hash(key)
    , dirname = self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c

  this._openFiles++
  this._busy[key] = true
  
  fs.readdir(dirname, function(err, files) {
    if (err) {
      self._openFiles--
      delete self._busy[key]
    
      if (cb) cb(err)
      return
    }
    
    var counter = files.length
      , keyvals = {}
    
    dirname += '/'
    
    for (var i=files.length; i--; ) {
      ;(function(file) {
        fs.readFile(dirname + file, 'utf8', function(err, data) {
          if (!err) keyvals[file] = data
          if (!--counter && cb) {
            self._openFiles--
            delete self._busy[key]
            
            cb(null, keyvals)
          }
        })
      }(files[i]))
    }
  })
}

Chaos.prototype._hkeys = function(key, cb) {
  if (typeof this._busy[key] != 'undefined') return this.hkeys(key, cb)
  
  var self = this
    , pos = this._hash(key)
    , dirname = self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c

  this._openFiles++
  this._busy[key] = true
  
  fs.readdir(dirname, function(err, files) {
    self._openFiles--
    delete self._busy[key]
    
    if (cb) cb(err, files)
  })
}

Chaos.prototype._hvals = function(key, cb) {
  if (typeof this._busy[key] != 'undefined') return this.hvals(key, cb)
  
  var self = this
    , pos = this._hash(key)
    , dirname = self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c

  this._openFiles++
  this._busy[key] = true
  
  fs.readdir(dirname, function(err, files) {
    if (err) {
      self._openFiles--
      delete self._busy[key]
    
      if (cb) cb(err)
      return
    }
  
    var counter = files.length
      , vals = []
  
    dirname += '/'
    
    for (var i=files.length; i--; ) {
      ;(function(file) {
        fs.readFile(dirname + file, 'utf8', function(err, data) {
          if (!err) vals.push(data)
          if (!--counter && cb) {
            self._openFiles--
            delete self._busy[key]
            
            cb(null, vals)
          }
        })
      }(files[i]))
    }
  })
}

;[ 'get', 'set', 'del'
 , 'getset', 'getdel', 'getorsetget'
 , 'incr', 'decr' 
 , 'hset', 'hget', 'hdel', 'hgetall', 'hkeys', 'hvals'
 ].forEach(function(command) {
  Chaos.prototype[command] = function() {
    this._queue('_' + command, to_array(arguments))
  }
})
