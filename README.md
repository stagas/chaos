chaos - a node.js database
==========================

Why chaos? Because we exploit the sha1 chaotic randomness to store the keys evenly in the filesystem.

## The idea

The first 2 characters of the sha1 hash of a key become the top dir in the tree, the next 1 becomes the
child dir in the tree and the rest of the hash becomes the filename. This means that the 1st time you
create a database, it will create 4,096 directories so it can then store keys/files in them. It
also means that while the sha1 has trillions of combinations, the filesystem has limitations way lower
than that. It depends on the filesystem but in general, but my guess is that less than 30,000 files in 
a folder should perform really well. This translates to a max 122,880,000 keys. Cool, eh?
Plus you can store any utf8 string or number you want, it's just a proxy to fs.readFile() and fs.writeFile().

## Installation

    npm install chaos

## Usage

    var db = require('chaos')('your database name')

## Commands

### db.set(key, val, function(err) {})

Sets a key value pair.

### db.get(key, function(err, val) {})

Gets the value of a key.
  
### db.del(key, function(err) {})

Deletes a key.

### db.incr(key, function(err, new_number) {})
### db.decr(key, function(err, new_number) {})

Increment or decrement a key value by 1 and return the new number. If a key doesn't exist or its value isn't a number it will be created starting from 0. Therefore will return 1 or -1 respectively.
  
### db.getset(key, val, function(err, old_val) {})
Get a key value and set another afterwards.
  
### db.getdel(key, function(err, val) {})
Get a key value and delete it afterwards.

### db.getorsetget(key, default_value, function(err, val) {})
Get a key's value or if it doesn't exist, set the value and get it afterwards.
  
### db.hset(hkey, field, val, function(err) {})
Set a hkey field value.

### db.hget(hkey, field, function(err, val) {})
Get the value of a hkey field.

### db.hdel(hkey, field, function(err) {})
Delete a hkey field (this deletes only a field, to delete the hkey itself, use `db.del(hkey)`).

### db.hgetall(hkey, function(err, field_value_object) {})
Get all field value pairs from a hkey (returns an object with fields as keys and their values).
  
### db.hkeys(hkey, function(err, fields_array) {})
Get all field names from a hkey. Returns an unsorted array with the field names.

### db.hvals(hkey, function(err, values_array) {})
Get all field values from a hkey. Returns an unsorted array with the field values.
  
## Future

* More commands
* Better tests
* Optimizations
* Who knows?

Contributions are welcome! :)

## Disclaimer

It's still just a proof of concept, no real life tests are done.

## Questions? 

Find me on Twitter @stagas and IRC freenode.net #node.js as stagas
