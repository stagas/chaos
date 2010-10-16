/*
 * chaos v0.0.1
 *
 * by stagas
 *
 */
 
var sys = require('sys')
  , fs = require('fs')
  , path = require('path')  
  , crypto = require('crypto')

var Chaos = exports.Chaos = function(dbName) {
  if (!(this instanceof Chaos)) return new Chaos(dbName)
  var self = this
  
  this.dbName = dbName

  var dir = __dirname + '/' + this.dbName
  
  this.ready = false
  
  path.exists(dir, function(exists) {
    if (!exists) {
      self._createDB(self.dbName)
    } else {
      self.ready = true
    }
  })
  
  this._hashAlgo = 'sha1'
  this._hashEnc = 'hex'
  
  this._maxOpenFiles = 30
  this._openFiles = 0
}

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

Chaos.prototype.set = function(key, val, cb) {
  if (this._openFiles < this._maxOpenFiles) {
    this._openFiles++
    this._write(this._hash(key), val, cb)
  } else {
    var self = this
    process.nextTick(function() { self.set(key, val, cb) })
  }
}

Chaos.prototype.get = function(key, cb) {
  if (this._openFiles < this._maxOpenFiles) {
    this._openFiles++
    this._read(this._hash(key), cb)
  } else {
    var self = this
    process.nextTick(function() { self.get(key, cb) })
  }
}


Chaos.prototype._write = function(pos, val, cb) {    
  var self = this

  fs.writeFile(self.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c, val, 'utf8', function(err) {
    self._openFiles--
    
    cb(err)
  })
}

Chaos.prototype._read = function(pos, cb) {
  var self = this

  fs.readFile(this.dbName +'/'+ pos.a +'/'+ pos.b +'/'+ pos.c, function(err, data) {
    self._openFiles--
    
    cb(err, data)
  })
}
