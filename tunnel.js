const cat = require('pull-cat');
const Notify = require('pull-notify');
const pull = require('pull-stream');
const debug = require('debug')('ssb:room:tunnel');

function ErrorDuplex(message) {
  var err = new Error(message);
  return {
    source: function(_abort, cb) {
      cb(err);
    },
    sink: function(read) {
      read(err, function() {});
    },
  };
}

exports.name = 'tunnel';
exports.version = '1.0.0';
exports.manifest = {
  announce: 'sync',
  leave: 'sync',
  isRoom: 'sync',
  connect: 'duplex',
  endpoints: 'source',
  ping: 'sync',
};

exports.permissions = {
  anonymous: {
    allow: ['connect', 'announce', 'leave', 'isRoom', 'ping', 'endpoints'],
  },
};

exports.init = function(ssb, _config) {
  if (!ssb.conn || !ssb.conn.connect) {
    throw new Error('tunnel plugin is missing the required ssb-conn plugin');
  }

  const endpoints = {};
  const notifyEndpoints = Notify();

  pull(
    ssb.conn.internalConnHub().listen(),
    pull.filter(
      ({type}) => type === 'connecting-failed' || type === 'disconnected',
    ),
    pull.filter(({key}) => !!key),
    pull.drain(({key}) => {
      debug('endpoint is no longer here: %s', key);
      endpoints[key] = null;
      notifyEndpoints(Object.keys(endpoints));
    }),
  );

  return {
    announce: function() {
      debug('received endpoint announcement from: %s', this.id);
      endpoints[this.id] = ssb.peers[this.id][0];
      notifyEndpoints(Object.keys(endpoints));
    },

    leave: function() {
      debug('endpoint is leaving: %s', this.id);
      endpoints[this.id] = null;
      notifyEndpoints(Object.keys(endpoints));
    },

    isRoom: () => true,

    endpoints: function() {
      if (this.id && this.id !== ssb.id) {
        debug('received endpoints subscription from: %s', this.id);
        if (!endpoints[this.id]) {
          endpoints[this.id] = ssb.peers[this.id][0];
          notifyEndpoints(Object.keys(endpoints));
        }
      }

      const initial = pull.values([Object.keys(endpoints)]);
      return cat([initial, notifyEndpoints.listen()]);
    },

    connect: function(opts) {
      if (!opts) return ErrorDuplex('opts *must* be provided');

      const target = opts.target;
      if (endpoints[target]) {
        debug('received tunnel request for target %s from %s', target, this.id);
        return endpoints[target].tunnel.connect(opts, () => {});
      } else {
        return ErrorDuplex('could not connect to: ' + target);
      }
    },

    ping: function() {
      return Date.now();
    },
  };
};
