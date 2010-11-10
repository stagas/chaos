// tests for chaos

var assert = require('assert')
  , db = require('./chaos')('databasetest')

var test = {}

test.hkeys = function() {
  db.del('john', function(err) {
    db.hset('john', 'last name', 'doe', function(err) {
      assert.equal(null, err)
      db.hget('john', 'last name', function(err, val) {
        assert.equal(null, err)
        assert.equal('doe', val)
      })
    })
  })
  
  var test_many = {
    'john': 'doe'
  , 'mary': 'loo'
  }
  var test_many_keys = []
  for (var k in test_many) {
    test_many_keys.push(k)
  }
  var test_many_vals = []
  for (var k in test_many) {
    test_many_vals.push(test_many[k])
  }  
  
  db.hset('persons', 'john', 'doe', function(err) {
    assert.equal(null, err)
    db.hset('persons', 'mary', 'loo', function(err) {
      assert.equal(null, err)
      db.hgetall('persons', function(err, data) {
        assert.equal(null, err)
        assert.deepEqual(data, test_many)
      })
      db.hkeys('persons', function(err, data) {
        assert.equal(null, err)
        assert.deepEqual(data.sort(), test_many_keys.sort())
      })
      db.hvals('persons', function(err, data) {
        assert.equal(null, err)
        assert.deepEqual(data.sort(), test_many_vals.sort())
      })
    })
  })
  
  db.hset('will', 'delete', 'now', function(err) {
    db.hdel('will', 'delete', function(err) {
      assert.equal(null, err)
      db.hget('will', 'delete', function(err) {
        assert.notEqual(null, err)
      })
    })
  })
}

for (var k in test) {
  test[k]()
}
