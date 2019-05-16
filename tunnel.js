var isFeed = require('ssb-ref').isFeed;
var DuplexPair = require('pull-pair/duplex');

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

function isObject(o) {
  return 'object' === typeof o;
}

exports.name = 'tunnel';
exports.version = '1.0.0';

exports.manifest = {
  announce: 'sync',
  connect: 'duplex',
  ping: 'sync',
};

exports.permissions = {
  anonymous: {allow: ['connect', 'announce', 'ping']},
};

exports.init = function(sbot, config) {
  var endpoints = {};

  var logging = config.tunnel && config.tunnel.logging;

  function log(msg) {
    if (logging) console.error(msg);
  }

  function parse(string) {
    var opts;
    if (isObject(string)) opts = string;
    else {
      var parts = string.split(':');
      if (parts[0] != 'tunnel') return;
      opts = {
        name: parts[0],
        portal: parts[1],
        target: parts[2],
        port: +parts[3] || 0,
      };
    }

    if (
      !(
        opts.name === 'tunnel' &&
        isFeed(opts.portal) &&
        isFeed(opts.target) &&
        Number.isInteger(opts.port)
      )
    )
      return;

    return opts;
  }

  var handlers = {};

  sbot.multiserver.transport({
    name: 'tunnel',
    create: function(config) {
      //at this point we've only created a transport,
      //it may be used for outgoing connections only.
      var portal = config.portal,
        instance = config.instance || 0;
      return {
        name: 'tunnel',
        scope: function() {
          return config.scope;
        },
        server: function(onConnect) {
          //now we are definitely creating a server. check that portal is configured.
          if (!portal)
            throw new Error(
              'ssb-tunnel is configured, but a portal is missing',
            );
          //just remember the reference, call it
          //when the tunnel api is called.
          var _rpc;
          setImmediate(function again() {
            //todo: put this inside the server creator?
            //it would at least allow the tests to be fully ordered
            var timer;
            function reconnect() {
              if (sbot.closed) return;
              clearTimeout(timer);
              timer = setTimeout(again, 1000 * Math.random());
            }
            //this plugin might be enabled, but a portal might not be set.
            if (!portal) {
              reconnect();
              return;
            }

            log('tunnel:listen - connecting to portal:' + portal);
            sbot.gossip.connect(portal, function(err, rpc) {
              if (err) {
                log(
                  'tunnel:listen - failed to connect to portal:' +
                    portal +
                    ' ' +
                    err.message,
                );
                reconnect();
                return;
              }
              _rpc = rpc;
              rpc.tunnel.announce(null, function(err) {
                if (err) {
                  log(
                    'tunnel:listen - error during announcement at ' +
                      portal +
                      ' ' +
                      err.message,
                  );
                  reconnect();
                  return;
                }
                //emit an event here?
                log('tunnel:listen - SUCCESS establishing portal:' + portal);
                sbot.emit('tunnel:listening', portal);
              });
              rpc.on('closed', function(err) {
                _rpc = null;
                log('tunnel:listen - portal closed:' + portal, err);
                sbot.emit('tunnel:closed');
                reconnect();
              });
            });
          });

          handlers[instance] = function(stream) {
            stream.address = 'tunnel:' + portal;
            onConnect(stream);
          };
          //close server
          return function() {
            if (_rpc) _rpc.close();
          };
        },
        client: function(addr, cb) {
          var opts = parse(addr);
          log('tunnel:connect - connect to portal:' + opts.portal);
          sbot.gossip.connect(opts.portal, function(err, rpc) {
            if (err) {
              log(
                'tunnel:connect - failed connect to portal:' +
                  opts.portal +
                  ' ' +
                  err.message,
              );
              cb(err);
            } else {
              log(
                'tunnel:connect - portal connected, tunnel to target:' +
                  opts.target,
              );
              cb(
                null,
                rpc.tunnel.connect({target: opts.target, port: opts.port}),
              );
            }
          });
        },
        parse: parse,
        stringify: function() {
          if (portal) return ['tunnel', portal, sbot.id, instance].join(':');
        },
      };
    },
  });

  return {
    announce: function(opts) {
      log('tunnel:portal - received endpoint announcement from:' + this.id);
      endpoints[this.id] = sbot.peers[this.id][0];
    },
    connect: function(opts) {
      if (!opts) return ErrorDuplex('opts *must* be provided');

      //if we are being asked to forward connections...
      //TODO: config to disable forwarding
      if (endpoints[opts.target]) {
        log(
          'tunnel:portal - received tunnel request for target:' +
            opts.target +
            ', from:' +
            this.id,
        );
        return endpoints[opts.target].tunnel.connect(opts);
      }
      //if this connection is for us
      else if (opts.target === sbot.id && handlers[opts.port]) {
        var streams = DuplexPair();
        handlers[opts.port](streams[0]);
        return streams[1];
      } else return ErrorDuplex('could not connect to:' + opts.target);
    },
    ping: function() {
      return Date.now();
    },
  };
};
