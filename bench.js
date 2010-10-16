//

var db = require('./chaos')('test')

var big = []
for (var i=1000; i--; ) {
  big.push(i)
}

var obj = JSON.stringify({
  there: 'is'
, only: 'chaos'
, butterfly: ['says', ['there', 'is', 'only', 'chaos']]
, pi: Math.PI
, big: big
})

var obj = 'hello' // comment this out to use the big object above

function bench(what, num, conc, cb) {
  console.log('    clients:', conc)
  console.log(' operations:', num)
  console.log('-------------------')
  
  switch (what) {
    case 'all':
      sets(num, conc, function() {
        gets(num, conc, function() {
          console.log('')
          cb()
        })
      })
      break
    case 'sets':
      sets(num, conc, function() {
        console.log('')
        cb()
      })
      break
    case 'gets':
    default:
      gets(num, conc, function() {
        console.log('')
        cb()
      })
      break
  }
}

function sets(num, conc, cb) {
  var timer = new Date()
    , done = 1
    , clients = 0

  var next = function(i) {
    if (done < num) {
      if (clients < conc) {
        clients++
        
        db.set(i, obj, function(err) {
          done++
          clients--
        })
        
        i++
        next(i)
      } else {
        process.nextTick(function() { next(i) })
      }
    } else {
      console.log('writes:', ( (num) / ((new Date() - timer) / 1000)).toFixed(2) + '/s')
      return cb()
    }
  }
  
  next(0)
}

function gets(num, conc, cb) {
  var timer = new Date()
    , done = 1
    , clients = 0

  var next = function(i) {
    if (done < num) {
      if (clients < conc) {
        clients++
        
        db.get(i, function(err, data) {
          done++
          clients--
        })
        
        i++
        next(i)
      } else {
        process.nextTick(function() { next(i) })
      }
    } else {
      console.log('reads:', ( (num) / ((new Date() - timer) / 1000)).toFixed(2) + '/s')
      return cb()
    }
  }
  
  next(0)
}

var scenario = [

  ['sets', 1000, 10]
, ['sets', 5000, 10]
, ['sets', 10000, 10]
  
, ['sets', 1000, 100]
, ['sets', 5000, 100]
, ['sets', 10000, 100]

, ['sets', 1000, 300]
, ['sets', 5000, 300]
, ['sets', 10000, 300]

, ['sets', 1000, 600]
, ['sets', 5000, 600]
, ['sets', 10000, 600]

, ['sets', 1000, 1000]
, ['sets', 5000, 1000]
, ['sets', 10000, 1000]

, ['sets', 1000, 1500]
, ['sets', 5000, 1500]
, ['sets', 10000, 1500]

, ['gets', 1000, 10]
, ['gets', 5000, 10]
, ['gets', 10000, 10]
  
, ['gets', 1000, 100]
, ['gets', 5000, 100]
, ['gets', 10000, 100]

, ['gets', 1000, 300]
, ['gets', 5000, 300]
, ['gets', 10000, 300]

, ['gets', 1000, 600]
, ['gets', 5000, 600]
, ['gets', 10000, 600]

, ['gets', 1000, 1000]
, ['gets', 5000, 1000]
, ['gets', 10000, 1000]

, ['gets', 1000, 1500]
, ['gets', 5000, 1500]
, ['gets', 10000, 1500]

]

scenarioLen = scenario.length

var next = function(i) {
  if (i < scenarioLen) {
    
    bench(scenario[i][0], scenario[i][1], scenario[i][2], function() {
      setTimeout(function() {
        next(++i)
      }, scenario[i][1] / 2) // give some time for the hd to breath
    })
    
  } else {
    console.log('all done')
  }
}

var start = function() {
  if (!db.ready) {
    setTimeout(function() { start() }, 1000)
  } else {
    console.log('benchmark starting...')
    console.log('')
    next(0)
  }
}

start()
