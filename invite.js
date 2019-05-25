const SEED = 'SSB+Room+PSK3TLYC2T86EHQCUHBUHASCASE18JBV24=';

module.exports = {
  name: 'invite',
  version: '1.0.0',
  manifest: {
    create: 'async',
    accept: 'async',
    use: 'async',
    get: 'sync',
  },
  permissions: {
    master: {allow: ['create', 'get']},
    anonymous: {allow: ['use']},
  },
  init: function(server, _config) {
    return {
      get: function() {
        return server.getAddress('public') + ':' + SEED;
      },
      create: function(_opts, cb) {
        cb(new Error('ssb-room does not create real invites'));
      },
      use: function(_req, cb) {
        cb(null, true); // Allow everyone
      },
      accept: function(_invite, cb) {
        cb(new Error('ssb-room should never consume invites'));
      },
    };
  },
};
