const pull = require('pull-stream');
const DuplexPair = require('pull-pair/duplex');
const ref = require('ssb-ref');
const debug = require('debug')('ssb:room:tunnel:client');
const ErrorDuplex = require('./error-duplex');

class RoomClient {
  constructor(ssb, serverKey, address, rpc, roomMetadata, onConnect) {
    this.ssb = ssb;
    this.serverKey = serverKey;
    this.address = address;
    this.rpc = rpc;
    this.roomMetadata = roomMetadata;
    this.onConnect = onConnect;
    this.connectionHandler = (stream, id) => {
      stream.address = 'tunnel:' + this.serverKey + ':' + id;
      debug(
        'handler will call onConnect for the stream.address: %s',
        stream.address,
      );
      this.onConnect(stream);
    };
    this.init();
  }

  init() {
    debug('announcing to portal: %s', this.serverKey);

    const roomName = this.roomMetadata && this.roomMetadata.name;
    if (roomName) {
      this.ssb.conn.internalConnDB().update(this.address, {name: roomName});
      this.ssb.conn.internalConnHub().update(this.address, {name: roomName});
    }

    pull(
      this.rpc.tunnel.endpoints(),
      (this.endpointsDrain = pull.drain(endpoints => {
        const room = this.serverKey;
        debug('got endpoints from %s: %s', room, JSON.stringify(endpoints));

        // Update onlineCount metadata for this room
        const onlineCount = endpoints.length;
        this.ssb.conn.internalConnHub().update(this.address, {onlineCount});

        // Detect removed endpoints, unstage them
        for (const entry of this.ssb.conn.internalConnStaging().entries()) {
          const [addr, data] = entry;
          if (data.room === room && data.key && !endpoints.includes(data.key)) {
            debug('will conn.unstage("%s")', addr);
            this.ssb.conn.unstage(addr);
          }
        }

        // Stage all the new endpoints
        for (const key of endpoints) {
          if (key === room) continue;
          if (key === this.ssb.id) continue;
          if (this.isAlreadyConnected(key)) continue;
          const address = this.getAddress(key);
          debug('will conn.stage("%s")', address);
          this.ssb.conn.stage(address, {
            type: 'room-endpoint',
            key,
            room,
            roomName,
          });
        }
      })),
    );
  }

  getAddress(key) {
    const shs = key.substr(1, key.length - 9);
    return `tunnel:${this.serverKey}:${key}~shs:${shs}`;
  }

  isAlreadyConnected(key) {
    for (const [, data] of this.ssb.conn.internalConnHub().entries()) {
      if (data.key === key) return true;
    }
    return false;
  }

  close() {
    if (this.endpointsDrain && this.endpointsDrain.abort) {
      this.endpointsDrain.abort();
    }
    for (const [addr, data] of this.ssb.conn.internalConnStaging().entries()) {
      if (data.room === this.serverKey) {
        this.ssb.conn.unstage(addr);
      }
    }
    this.rpc.close();
  }
}

function init(ssb) {
  if (!ssb.conn || !ssb.conn.connect) {
    throw new Error('tunnel plugin is missing the required ssb-conn plugin');
  }

  const rooms = new Map();
  var parseFn;

  ssb.multiserver.transport({
    name: 'tunnel',
    create(msConfig) {
      return {
        name: 'tunnel',

        scope() {
          return msConfig.scope;
        },

        server(onConnect) {
          // Once a room disconnects, teardown
          pull(
            ssb.conn.internalConnHub().listen(),
            pull.filter(({type}) => type === 'disconnected'),
            pull.filter(({key}) => !!key && rooms.has(key)),
            pull.drain(({key}) => {
              rooms.get(key).close();
              rooms.delete(key);
            }),
          );

          // Once a peer connects, detect rooms, and setup room portals
          pull(
            ssb.conn.internalConnHub().listen(),
            pull.filter(({type}) => type === 'connected'),
            pull.drain(({address, key, details}) => {
              if (!key || !details || !details.rpc) return;
              if (rooms.has(key)) return;
              const rpc = details.rpc;
              debug(
                'will try to call tunnel.isRoom() at new gossip peer: %s',
                key,
              );
              rpc.tunnel.isRoom((err, res) => {
                if (err || !res) return;
                debug('is connected to an actual ssb-room');
                rooms.set(
                  key,
                  new RoomClient(ssb, key, address, rpc, res, onConnect),
                );
              });
            }),
          );

          // close server
          return () => {
            rooms.forEach(roomClient => {
              roomClient.close();
            });
            rooms.clear();
          };
        },

        client(addr, cb) {
          debug(`we wish to connect to ${addr}`);
          const opts = parseFn(addr);
          if (!opts) {
            cb(new Error(`invalid tunnel address ${addr}`));
            return;
          }
          const {portal, target} = opts;
          if (!rooms.has(portal)) {
            cb(new Error(`room ${portal} is offline`));
            return;
          }

          const rpc = rooms.get(portal).rpc;
          debug(`will call tunnel.connect at ${target} via room ${portal}`);
          cb(null, rpc.tunnel.connect({target, portal}, () => {}));
        },

        parse: (parseFn = function parse(addr) {
          let opts;
          if (typeof addr === 'object') {
            opts = addr;
          } else {
            const parts = addr.split(':');
            opts = {name: parts[0], portal: parts[1], target: parts[2]};
          }
          if (opts.name !== 'tunnel') return;
          if (!ref.isFeed(opts.portal)) return;
          if (!ref.isFeed(opts.target)) return;
          return opts;
        }),

        stringify() {
          return undefined;
        },
      };
    },
  });

  return {
    isRoom(cb) {
      cb(null, false);
    },

    connect(opts) {
      if (!opts) return ErrorDuplex('opts *must* be provided');
      debug('received incoming tunnel.connect(%o)', opts);
      const {target, portal, origin} = opts;
      if (target === ssb.id && rooms.has(portal)) {
        debug('connect() will resolve because handler exists');
        const handler = rooms.get(portal).connectionHandler;
        const streams = DuplexPair();
        handler(streams[0], origin || this.id);
        return streams[1];
      } else {
        return ErrorDuplex(`could not connect to ${target}`);
      }
    },

    ping() {
      return Date.now();
    },
  };
}

module.exports = {
  name: 'tunnel',
  version: '1.0.0',
  manifest: {
    announce: 'sync', // not implemented
    leave: 'sync', // not implemented
    endpoints: 'source', // not implemented
    isRoom: 'async',
    connect: 'duplex',
    ping: 'sync',
  },
  permissions: {
    anonymous: {allow: ['connect', 'ping', 'isRoom']},
  },
  init,
};
