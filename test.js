'use strict';
var concat = require('concat-stream'),
  test = require('tape'),
  File = require('vinyl'),
  map = require('./'),
  fs = require('fs');

test('null streams are just passed on', function (t) {
  var file = new File({
      contents: null
    }),
    stream = map(function () {
      t.fail('should not get called');
    });

  stream.once('end', function () {
    t.end();
  }).end(file);
});

test('buffer streams are passed a buffer', function (t) {
  var contents = fs.readFileSync(__filename),
    file = new File({
      contents: contents
    }),
    stream = map(function (src) {
      t.ok(Buffer.isBuffer(src), 'Buffer.isBuffer(contents)');
      t.equal(String(contents), String(src), 'Buffer contents are correct');
    });

  stream.once('end', function () {
    t.end();
  }).end(file);
});

test('modifying buffer streams', function (t) {
  var contents = fs.readFileSync(__filename),
    file = new File({
      contents: contents
    }),
    stream = map(function (src) {
      t.ok(Buffer.isBuffer(src), 'Buffer.isBuffer(contents)');
      t.equal(String(contents), String(src), 'Buffer contents are correct');
      return String(src).toUpperCase();
    }).on('data', function (file) {
      t.ok(Buffer.isBuffer(file.contents), 'output contents are a buffer');
      t.equal(String(file.contents), String(contents).toUpperCase());
    });

  t.plan(5);

  stream.once('end', function () {
    t.pass('Reached "end" event');
  }).end(file);
});

test('multiple buffers in a pipeline', function (t) {
  var contents = fs.readFileSync(__filename),
    file = new File({
      contents: contents
    }),
    stream = createStream();

  t.plan(9);

  function createStream() {
    return map(function (src) {
      t.ok(Buffer.isBuffer(src), 'Buffer.isBuffer(contents)');
      t.equal(String(contents), String(src), 'Buffer contents are correct');
    });
  }

  stream
    .pipe(createStream())
    .pipe(createStream())
    .pipe(createStream())
    .once('end', function () {
      t.pass('reached stream "end" event');
    });

  stream.end(file);
});

test('stream streams are passed a stream', function (t) {
  var fileStream = fs.createReadStream(__filename),
    contents = fs.readFileSync(__filename),
    file = new File({
      contents: fileStream
    }),
    stream = map(function (src) {
      t.ok(Buffer.isBuffer(src), 'Buffer.isBuffer(contents)');
      t.equal(String(contents), String(src), 'Buffer contents are correct');
    });

  t.plan(2);

  stream.once('end', function () {
    t.end();
  }).end(file);
});

test('stream streams are passed a stream, modifying output stream', function (t) {
  var fileStream = fs.createReadStream(__filename),
    contents = fs.readFileSync(__filename),
    file = new File({
      contents: fileStream
    }),
    stream = map(function (src) {
      t.ok(Buffer.isBuffer(src), 'Buffer.isBuffer(contents)');
      t.equal(String(contents), String(src), 'Buffer contents are correct');
      return String(src).toUpperCase();
    }).on('data', function (file) {
      t.ok(file.contents.pipe, 'output contents are a stream');
      file.contents.pipe(concat(function (upper) {
        t.equal(String(upper), String(contents).toUpperCase());
      }));
    });

  t.plan(5);

  stream.once('end', function () {
    t.pass('reached "end" event');
  }).end(file);
});

test('multiple stream streams in a pipeline passing streams', function (t) {
  var contents = fs.readFileSync(__filename),
    fileStream = fs.createReadStream(__filename),
    file = new File({ contents: fileStream }),
    stream = createStream();

  t.plan(17);

  function createStream() {
    return map(function (src) {
      t.ok(Buffer.isBuffer(src), 'Buffer.isBuffer(contents)');
      t.equal(String(contents), String(src), 'Buffer contents are correct');
    }).once('data', function (file) {
      t.ok(file.contents.pipe, 'output contents are a stream');
      t.ok(!Buffer.isBuffer(file), 'output contents are not a buffer');
    });
  }

  stream
    .pipe(createStream())
    .pipe(createStream())
    .pipe(createStream())
    .once('end', function () {
      t.pass('reached stream "end" event');
    });

  stream.end(file);
});

test('first thrown error in sync mapper gets emitted as an error', function (t) {
  var stream = map(function () {
    throw new Error('should be caught');
  }).on('error', function (err) {
    t.ok(err, 'error was caught and emitted');
  }).on('data', function () {
    t.fail('should not get emitted as "data"');
  });

  t.plan(1);

  stream.write(new File({ contents: new Buffer(' ') }));
  stream.write(new File({ contents: new Buffer(' ') }));
  stream.end();
});

test('async with third arg passed in', function (t) {
  var contents = fs.readFileSync(__filename),
    file = new File({
      contents: contents
    }),
    stream = map(function (src, filename, done) {
      t.ok(Buffer.isBuffer(src), 'Buffer.isBuffer(contents)');
      t.equal(String(contents), String(src), 'Buffer contents are correct');
      done(null, String(src).toUpperCase());
    }).on('data', function (file) {
      t.ok(Buffer.isBuffer(file.contents), 'output contents are a buffer');
      t.equal(String(file.contents), String(contents).toUpperCase());
    });

  t.plan(5);

  stream.once('end', function () {
    t.pass('Reached "end" event');
  }).end(file);
});

test('async emits error if passed to done', function (t) {
  var stream = map(function (src, filename, done) {
    done(new Error('should be caught'));
  }).on('error', function (err) {
    t.ok(err, 'error was caught and emitted');
  }).on('data', function () {
    t.fail('should not get emitted as "data"');
  });

  t.plan(1);

  stream.write(new File({ contents: new Buffer(' ') }));
  stream.write(new File({ contents: new Buffer(' ') }));
  stream.end();
});
