const fs = require('fs');
const path = require('path');
const express = require('express');
const mime = require('mime-types');
const pull = require('pull-stream');
const toPull = require('stream-to-pull-stream');
const ident = require('pull-identify-filetype');
const qr = require('qr-image');
const ref = require('ssb-ref');
const debug = require('debug')('ssb:mirror:http');

module.exports = function startHTTP(ssbServer) {
  const app = express();
  app.use(express.static(__dirname + '/assets'));
  app.use(require('body-parser').urlencoded({extended: true}));
  app.set('port', 8007);
  app.set('views', __dirname + '/pages');
  app.set('view engine', 'ejs');

  const feedFilePath = path.join(ssbServer.config.path, 'mirror');

  app.get('/', (_req, res) => {
    const invite = ssbServer.invite.get();
    const host = ref.parseAddress(ref.parseMultiServerInvite(invite).remote)
      .host;
    const qrCode = qr.svgObject(invite);
    fs.access(feedFilePath, fs.constants.F_OK, doesNotExist => {
      if (doesNotExist) {
        debug('There is no mirror file, ask for setup');
        res.render('setup', {
          host: host,
          invite: invite,
          qrSize: qrCode.size,
          qrPath: qrCode.path,
        });
      } else {
        debug('There is a mirror file');
        fs.readFile(feedFilePath, {encoding: 'utf-8'}, (err1, feed) => {
          if (err1) {
            debug('ERROR loading mirror file');
            feed = ssbServer.id;
          }
          debug('The target feed: ' + feed);
          ssbServer.about.socialValue(
            {key: 'name', dest: feed},
            (err2, name) => {
              debug('socialValue name: ' + name);
              if (err2) name = null;
              ssbServer.about.socialValue(
                {key: 'image', dest: feed},
                (err3, val) => {
                  debug('socialValue image: ' + val);
                  let image = val;
                  if (err3) image = null;
                  if (!!val && typeof val === 'object' && val.link)
                    image = val.link;

                  debug('blobs has this image? ' + image);
                  ssbServer.blobs.has(image, (err3, has) => {
                    debug('has=' + has);
                    if (err3 || !has) image = null;

                    res.render('index', {
                      host: host,
                      id: feed,
                      name: name,
                      image: image,
                      invite: invite,
                      qrSize: qrCode.size,
                      qrPath: qrCode.path,
                    });
                  });
                },
              );
            },
          );
        });
      }
    });
  });

  app.get('/avatar', (req, res) => {
    fs.readFile(feedFilePath, {encoding: 'utf-8'}, (err1, feed) => {
      if (err1) feed = ssbServer.id;
      ssbServer.about.socialValue({key: 'image', dest: feed}, (err, val) => {
        debug('socialValue image: ' + val);
        if (err) {
          res.writeHead(404);
          res.end('File not found');
          return;
        }
        let image = val;
        if (!!val && typeof val === 'object' && val.link) image = val.link;

        pull(
          ssbServer.blobs.get(image),
          ident(type => {
            if (type) res.writeHead(200, {'Content-Type': mime.lookup(type)});
          }),
          toPull.sink(res),
        );
      });
    });
  });

  return app.listen(app.get('port'), () => {
    debug('Express app is running on port %s', app.get('port'));
  });
};
