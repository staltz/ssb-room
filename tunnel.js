const cat = require('pull-cat');
const Notify = require('pull-notify');
const pull = require('pull-stream');
const debug = require('debug')('ssb:room:tunnel');

function ErrorDuplex(message) {
  var err = new Error(message);
  return {
    source: function(abort, cb) {
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
  const NAME = '_ssbRoomTunnelName';

  function serializeEndpoints() {
    return Object.keys(endpoints).map(id => {
      const out = {id, address: `tunnel:${ssb.id}:${id}`};
      if (endpoints[id][NAME]) out.name = endpoints[id][NAME];
      return out;
    });
  }

  pull(
    ssb.conn.internalConnHub().listen(),
    pull.filter(
      ({type}) => type === 'connecting-failed' || type === 'disconnected',
    ),
    pull.filter(({key}) => !!key),
    pull.drain(({key}) => {
      debug('endpoint is no longer here: %s', key);
      endpoints[key] = null;
      notifyEndpoints(serializeEndpoints());
    }),
  );

  return {
    announce: function(opts) {
      debug('received endpoint announcement from: %s', this.id);
      endpoints[this.id] = ssb.peers[this.id][0];
      if (opts && opts.name) endpoints[this.id][NAME] = opts.name;
      notifyEndpoints(serializeEndpoints());
    },

    leave: function() {
      debug('endpoint is leaving: %s', this.id);
      endpoints[this.id] = null;
      notifyEndpoints(serializeEndpoints());
    },

    isRoom: () => true,

    endpoints: function() {
      const initial = pull.values([serializeEndpoints()]);
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
