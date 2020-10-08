const SecretStack = require('secret-stack');
const CONN = require('ssb-conn/core')
const Gossip = require('ssb-conn/compat')
const ConnScheduler = require('./conn-scheduler');

SecretStack({appKey: require('ssb-caps').shs})
  .use(require('ssb-master'))
  .use(require('ssb-logging'))
  .use([CONN, ConnScheduler, Gossip])
  .use(require('./invite'))
  .use(require('./tunnel/server'))
  .use(require('./http-server'))
  .use(require('./ssb-shims'))
  .call(null, require('./config'));
