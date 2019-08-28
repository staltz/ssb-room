# FAQ: Frequently Asked Questions

## Is there a list of all rooms that exist?

To avoid any point of centralization, I'll refuse to build or give visibility to any directory of rooms.

However, one good practice to find (or announce) new rooms is to **share it on various social media platforms under the hashtag `#ssbroom`.** This is decentralized, but still easy and convenient for discovery of rooms.

- [#ssbroom on Twitter](https://twitter.com/search?q=%23ssbroom)
- [#ssbroom on Facebook](https://www.facebook.com/search/top/?q=%23ssbroom)
- [#ssbroom on Instagram](https://www.instagram.com/explore/tags/ssbroom/)
- [#ssbroom on Mastodon Social](https://mastodon.social/web/timelines/tag/ssbroom)
- [#ssbroom on LinkedIn](https://www.linkedin.com/feed/hashtag/ssbroom/)
- [#ssbroom on Minds](https://www.minds.com/newsfeed/global/hot;hashtag=ssbroom)
- [#ssbroom on Tumblr](https://www.tumblr.com/search/%23ssbroom)
- [#ssbroom on Pinterest](https://www.pinterest.com/search/pins/?q=%23candy)
- [#ssbroom on GitHub](https://github.com/topics/ssbroom)

## What are the privacy implications of using room servers?

It is technically possible that the person(s) operating a room server might access or track the following information from each client:

- SSB ID
- IP address

The room server cannot know anything else about your account, none of your feed messages, none of your profile pictures. We advise to only connect to rooms operated by trusted people if you're not comfortable sharing the 2 pieces of information listed above with strangers. Granted, SSB rooms leak significantly less personal information than SSB pubs do.

In the rare situation that the source code for the room server was modified (deviating from the Docker image this repo provides), then it is possible that the room server acts like a pub server, and as such it could fetch your public feed data, profile picture, etc.

## How does this work?

Rooms utilize a fork of [ssb-tunnel](https://github.com/ssbc/ssb-tunnel) to create a p2p link tunneled through a server with a public IP address. The fork of ssb-tunnel in SSB Room is backwards compatible with ssb-tunnel, and we should consider merging the features back upstream in the future.

A tunnel is an onion encrypted connection between two room clients, using [secret-handshake](https://github.com/auditdrivencrypto/secret-handshake). Between the room and the room client, there is a secret-handshake (encrypted and mutually authenticated) channel, as well as another secret-handshake channel between two connected room clients. This means the room server itself cannot learn about the contents of a tunnel between two of its clients, even though it acts as an intermediary between them.

## How do I add a domain name to my room server?

In case you want to have a custom domain address for that page, such as `room.scuttlebutt.nz` instead of a raw IP address, you need to (1) own a domain (there are many providers for this), and (2) setup DNS to add an `A` record pointing to the IP address you got from DigitalOcean.

## How do I setup a room without using the Digital Ocean Installer?

[Read here](./manual-setup.md) on how to setup a room manually, using Docker containers on your preferred server provider.

## How do I add support for rooms in my SSB app?

[Read here](./DEVELOPERS.md) on how to use this project as an SSB Node.js plugin.
