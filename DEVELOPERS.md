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
