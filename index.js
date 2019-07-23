const SecretStack = require('secret-stack');

SecretStack({appKey: require('ssb-caps').shs})
  .use(require('ssb-master'))
  .use(require('ssb-logging'))
  .use(require('ssb-conn'))
  .use(require('./invite'))
  .use(require('./tunnel'))
  .use(require('./http-server'))
  .call(null, require('./config'));
