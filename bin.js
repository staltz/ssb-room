#! /usr/bin/env node

const Client = require('ssb-client');
const manifest = require('./manifest');
const config = require('./config');

const lastArgv = process.argv[process.argv.length - 1];

if (lastArgv === 'start') {
  require('./index');
} else if (lastArgv === 'check') {
  // normal command:
  // create a client connection to the server

  var opts = {
    manifest: manifest,
    port: config.port,
    host: config.host || 'localhost',
    caps: config.caps,
    key: config.key || config.keys.id,
  };

  // connect
  Client(config.keys, opts, function(err1, rpc) {
    if (err1) {
      if (/could not connect/.test(err1.message)) {
        console.error(
          'Error: Could not connect to ssb-server ' +
            opts.host +
            ':' +
            opts.port,
        );
        console.error('Use the "start" command to start it.');
        console.error('Use --verbose option to see full error');
        if (config.verbose) throw err1;
        process.exit(1);
      }
      throw err1;
    }

    rpc.whoami((err2, x) => {
      if (err2) {
        console.error(err2);
        process.exit(1);
      } else {
        console.log(x.id);
        process.exit(0);
      }
    });
  });
}
