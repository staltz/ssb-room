require('ssb-server/index')
  .use(require('ssb-master'))
  .use(require('ssb-logging'))
  .use(require('ssb-legacy-conn'))
  .use(require('./invite'))
  .use(require('./tunnel'))
  .use(require('./http-server'))
  .call(null, require('./config'));
