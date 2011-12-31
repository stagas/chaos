require('../').connect(function (db) {
  var TIMES = 1000

  function calcSpeed (then, times) {
    var now = Date.now()
    var diff = now - then
    var diffs = diff / 1000
    console.log('')
    console.log('Ops:', times)
    console.log('Time it took to finish:', diffs + 's')
    console.log('Ops / sec:', times / diffs)
    console.log('1 op duration:', (diffs / times) + 's')
  } 

  function sets (next) {
    var dataToWrite = 'bench'
    var times = TIMES
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
    var times = TIMES
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
})
