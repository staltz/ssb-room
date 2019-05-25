# SSB Room

**A server to find and connect to other SSB peers – a meeting place.**

- A [Secure Scuttlebutt (SSB)](https://www.scuttlebutt.nz) server for your community
- Friends currently online can connect to each other, bridged by the room server
- No developer skills required! Clicking on websites is enough to set this up
- Comes with a friendly web page interface

<img src="./screenshots/ready.png" width="480">

SSB [*Pubs*](https://www.scuttlebutt.nz/concepts/pub) are servers that hold copies of several SSB accounts, allowing you to sync with multiple friends, even if those friends are not currently online. *Rooms* are alternatives to Pubs that have an important difference: rooms **do not store any feed data**, but instead allow **currently online friends to connect to each other** and sync with each other.

The advantages are:

- Discover accounts that share a common interest with you
- Choose who you want to connect with (helps avoid an influx of strangers)
- Open invites makes it easy to onboard people onto SSB
- No concerns about hosting other people's data on the internet
- Lightweight server to setup and maintain, because it holds no data

The caveat is that you can only connect with accounts that are currently online in the same room. That said, you can still fetch the updates of an offline friend if another account online in the room also follows that offline friend.

## How to setup an SSB room

### The easy way

1. Create an account on [DigitalOcean](https://www.digitalocean.com/) and setup a billing method

2. Press this button [![Install on DigitalOcean](http://butt.nz/button.svg)](http://butt.nz/install?url=https://github.com/staltz/ssb-room) to create a server on DigitalOcean and setup SSB Room

3. Follow the instructions on that page until you see this big button, and press it. "Go to your new app!"

<img src="./screenshots/step-1.png" width="480">

4. You will see this initial page. Setup a name and description for your room server, and press "Done".

<img src="./screenshots/step-2.png" width="480">

5. In the next page, **copy the invite code and paste** it into your SSB app

<img src="./screenshots/step-3.png" width="480">

6. In your SSB app, when friends join, your apps will sync.

7. Now you can tell the people to visit this page and they can also get that invite code to join the room.

### Adding a domain name

In case you want to have a custom domain address for that page, such as `room.staltz.com` instead of a raw IP address, you need to (1) own a domain (there are many providers for this), (2) setup DNS to add an `A` record pointing to the IP address you got from DigitalOcean.

### The custom way

[Read here](./manual-setup.md) on how to setup a room manually, using Docker containers on your preferred server provider.

## Privacy

It is technically possible that the person(s) operating a room server might access or track the following information from each client:

- SSB ID
- IP address
- User nickname (only if client apps send this, most do)

The room server cannot know anything else about your account, none of your feed messages, none of your profile pictures. We advise to only connect to rooms operated by trusted people if you're not comfortable sharing the 3 pieces of information listed above with strangers. Granted, SSB rooms leak significantly less personal information than SSB pubs do.

## Acknowledgements and donations

A large portion of this project was forked from ahdinosaur's superb [ssb-pub](https://github.com/ahdinosaur/ssb-pub). Support them on their [OpenCollective](https://opencollective.com/sunrise-choir).

As for myself, you can support my work on the [Manyverse OpenCollective](https://opencollective.com/manyverse).

## License

AGPL-3.0
