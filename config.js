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
      // Enable this to add WebSockets support over HTTP.
      // ws: [{scope: 'public', transform: 'shs', port: 8009, host: '0.0.0.0', http: true}],
      // Enable this (and customize) to add WebSockets support over HTTPS.
      // ws: [{scope: 'public', transform: 'shs', port: 8009, host: '0.0.0.0', external: ["example.com"], key: "/etc/letsencrypt/live/example.com/privkey.pem", cert: "/etc/letsencrypt/live/example.com/cert.pem" }],
    },
    outgoing: {
      net: [{transform: 'shs'}],
    },
  },
});

module.exports = config;
