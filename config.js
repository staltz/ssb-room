const crypto = require('crypto');
const ssbKeys = require('ssb-keys');
const Config = require('ssb-config/inject');
const manifest = require('./manifest');

let keys = null;
if (typeof process.env.SEED === 'string' && process.env.SEED.length > 4) {
  const hash = crypto.createHmac('sha256', process.env.SEED).digest('hex');
  const seed = Buffer.from(hash, 'hex');
  keys = ssbKeys.generate('ed25519', seed);
}

const config = Config('ssb', {
  manifest: manifest,
  logging: {level: 'info'},
  keys,
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
