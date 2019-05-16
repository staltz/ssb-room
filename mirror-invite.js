const fs = require('fs');
const path = require('path');

const SEED = 'SSB+Mirror+K3TLYC2T86EHQCUHBUHASCASE18JBV24=';

function maybeLoadMirror(server, feedFilePath) {
  fs.access(feedFilePath, fs.constants.F_OK, err1 => {
    if (!err1) {
      fs.readFile(feedFilePath, {encoding: 'utf-8'}, (err2, feed) => {
        if (err2) {
          console.error(err2);
          process.exit(1);
          return;
        }
        console.log('Loading mirror of feed ' + feed);
        server.replicate.request(feed, true);
      });
    }
  });
}

function maybeSetupMirror(server, feedFilePath, req) {
  fs.access(feedFilePath, fs.constants.F_OK, err1 => {
    if (err1) {
      console.log('Setting up mirror of feed ' + req.feed);
      fs.writeFile(feedFilePath, req.feed, err2 => {
        if (err2) {
          console.error(err2);
          process.exit(1);
          return;
        }
        server.publish(
          {type: 'contact', contact: req.feed, following: true},
          err3 => {
            if (err3) {
              console.error(err3);
              process.exit(1);
              return;
            }
            server.replicate.request(req.feed, true);
            console.log('Mirror is now successfully set up.');
          },
        );
      });
    }
  });
}

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
  init: function(server, config) {
    const feedFilePath = path.join(config.path, 'mirror');
    maybeLoadMirror(server, feedFilePath);

    return {
      get: function() {
        return server.getAddress('public') + ':' + SEED;
      },
      create: function(_opts, cb) {
        cb(new Error('ssb-mirror does not create real invites'));
      },
      use: function(req, cb) {
        maybeSetupMirror(server, feedFilePath, req);
        cb(null, true); // Allow everyone
      },
      accept: function(_invite, cb) {
        cb(new Error('ssb-mirror should never consume invites'));
      },
    };
  },
};
