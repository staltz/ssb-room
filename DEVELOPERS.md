# Instructions for developers

**How to setup support for Rooms in your SSB app**

The package "ssb-room" contains code for both server and client. The server is intended to run in cloud services such as DigitalOcean and Vultr and other Docker-enabled clouds. The client code is intended to run in end-user SSB apps such as Patchwork, Patchbay and Manyverse.

This document describes how to setup the client side.

## Installation

**Prerequisites:**

- Node.js 6.5.0 or higher
- Requires secret-stack@^6.2.0
- [ssb-conn](https://github.com/staltz/ssb-conn) must be configured instead of ssb-gossip

```
npm install --save ssb-room
```

Require and use the following plugin into your ssb-server or secret-stack setup:

```diff
 SecretStack({appKey: require('ssb-caps').shs})
   .use(require('ssb-master'))
   .use(require('ssb-logging'))
   .use(require('ssb-conn'))
   .use(require('ssb-replicate'))
   .use(require('ssb-ebt'))
+  .use(require('ssb-room/tunnel/client'))
   .use(require('ssb-friends'))
   .use(require('ssb-about'))
   .call(null, require('./config'));
```

Also, configure your [ssb-config connections](https://github.com/ssbc/ssb-config) to allow incoming and outgoing `tunnel` connections. Both are necessary:

```diff
 connections: {
   incoming: {
     net: [{scope: 'private', transform: 'shs', port: NET_PORT}],
     bluetooth: [{scope: 'public', transform: 'shs'}],
+    tunnel: [{scope: 'public', transform: 'shs'}],
   },
   outgoing: {
     net: [{transform: 'shs'}],
     bluetooth: [{scope: 'public', transform: 'shs'}],
+    tunnel: [{transform: 'shs'}],
   },
 };
```

## Usage

There is no special muxrpc you need to use, instead, you just use SSB CONN's APIs to connect with Rooms and the peers online in a Room.

If a Room gives the user an invite code, then you can use the **following utilities** to extract the [multiserver](https://github.com/ssbc/multiserver) `address` of the Room:

```js
const utils = require('ssb-room/utils')

/**
 * Returns a boolean indicating whether this
 * string is an invite code to some Room.
 */
utils.isInvite(str)

/**
 * Returns a multiserver address but
 * returns null if `str` is not an invite.
 */
utils.inviteToAddress(str)

/**
 * If `addr` refers to the multiserver address
 * for a Room server, then this returns an invite
 * code to that Room.
 */
utils.addressToInvite(addr)
```

For example, if you call `utils.inviteToAddress(invite)`, you now have `address`, and you can call `ssb.conn.connect(address, {type: 'room'}, cb)`.

Once the Room is connected to, the `ssb-room/tunnel/client` plugin will automatically stage the peers currently online in that Room, and then using `ssb.conn.stagedPeers()` you can read those peers and optionally connect to them using the address they announced. Read more about this in the [docs for SSB CONN](https://github.com/staltz/ssb-conn).

**Rooms are not accounts to be followed.** Although every room server has an SSB id, this is only used for encryption through secret-handshake, and does not represent a "feed" in any sense. Your app should not display room servers as accounts, users should not assign names or profile pictures, because the room never publishes anything on SSB. If accounts follow a room, this would only pollute the social graph with no benefit.

## How to add the room plugin to your pub or other server

Room functionality is not limited to the Docker image in this repo, you can also *add room functionality* to your existing server, thanks to the plugin architecture in the Node.js implementation of SSB. The procedure is similar, but easier, than the above setup for clients.

**Prerequisites:**

- Node.js 6.5.0 or higher
- Requires secret-stack@^6.2.0
- [ssb-conn](https://github.com/staltz/ssb-conn) must be configured instead of ssb-gossip

```
npm install --save ssb-room
```

Require and use the following plugin into your ssb-server or secret-stack setup:

```diff
 SecretStack({appKey: require('ssb-caps').shs})
   .use(require('ssb-master'))
   .use(require('ssb-logging'))
   .use(require('ssb-conn'))
   .use(require('ssb-replicate'))
   .use(require('ssb-ebt'))
+  .use(require('ssb-room/tunnel/server'))
+  .use(require('ssb-room/invite')) // OPTIONAL!
+  .use(require('ssb-room/http-server')) // OPTIONAL!
   .use(require('ssb-friends'))
   .use(require('ssb-about'))
   .call(null, require('./config'));
```

The two optional plugins `ssb-room/invite` and `ssb-room/http-server` help to provide (respectively) invite codes and a user friendly web page, but they are not strictly necessary. Room clients can connect to a room simply by knowing its public multiserver address (typically a TCP address e.g. `net:myroom.cool:8008~shs:etcetc`).

You **do not need to add `tunnel` configurations in your ssb-config**. You only need to make sure there is a public `net` incoming configuration, such as:

```
connections: {
  incoming: {
    net: [{scope: 'public', transform: 'shs', port: 8008, host: '0.0.0.0'}],
  },
  // ...
```

When clients connect to your server, they will automatically call `rpc.tunnel.isRoom` in order to learn whether this server supports the room protocol or not. If the plugins were installed correctly, `isRoom` returns true, and clients will proceed to call other room-related RPC functions.
