var chaos = require('../')
var db = chaos(__dirname + '/bench-db')

function calcSpeed (then, times) {
  var now = Date.now()
  var diff = now - then
  var diffs = diff / 1000
  console.log('Time it took:', diffs + 's')
  console.log('Operations / sec:', times / diffs)
  console.log('Time for 1 operation:', (diffs / times) + 's')
} 

function sets (next) {
  var dataToWrite = 'bench'
  var times = 10000
  var count = times
  var then = Date.now()

  for (var key = times; key--; ) {
    db.set(key, dataToWrite, function (err) {
      if (!--count) {
        calcSpeed(then, times)
        next()
      }
    })
  }
}

function gets (next) {
  var times = 10000
  var count = times
  var then = Date.now()

  for (var key = times; key--; ) {
    db.get(key, function (err) {
      if (!--count) {
        calcSpeed(then, times)
        next()
      }
    })
  }
}

sets(gets.bind(this, function () {
  console.log('done')
}))
