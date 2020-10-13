const Config = require('ssb-config/inject');
const manifest = require('./manifest');

const config = Config('ssb', {
  manifest: manifest,
  logging: {level: 'info'},
  port: 8008,
  host: '0.0.0.0',
  replicate: {
    legacy: true, // We don't need EBT because there is no pub-to-pub comms
  },
  conn: {
    autostart: false,
  },
  connections: {
    incoming: {
      net: [{scope: 'public', transform: 'shs', port: 8008, host: '0.0.0.0'}],
    },
    outgoing: {
      net: [{transform: 'shs'}],
    },
  },
});

module.exports = config;
