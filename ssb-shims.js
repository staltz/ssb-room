const pull = require('pull-stream');

// Shim createHistoryStream as a dummy method so that peers who
// try to "replicate" with a room server won't get errors, but
// empty streams instead.

module.exports = {
  manifest: {
    createHistoryStream: 'source',
  },
  permissions: {
    master: {allow: null, deny: null},
    anonymous: {allow: ['createHistoryStream'], deny: null},
  },
  init: function(_server) {
    return {
      createHistoryStream: function(_opts) {
        return pull.empty();
      },
    };
  },
};
