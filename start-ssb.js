function startSSB() {
  return require('ssb-server/index')
    .use(require('ssb-server/plugins/master'))
    .use(require('ssb-server/plugins/logging'))
    .use(require('ssb-legacy-conn'))
    .use(require('ssb-replicate'))
    .use(require('ssb-blobs'))
    .use(require('./mirror-invite'))
    .use(require('ssb-backlinks')) // required by ssb-about
    .use(require('ssb-about'))
    .call(null, require('./config'));
}

module.exports = startSSB;
