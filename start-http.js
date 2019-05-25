const fs = require('fs');
const path = require('path');
const express = require('express');
const qr = require('qr-image');
const ref = require('ssb-ref');
const pull = require('pull-stream');
const debug = require('debug')('ssb:room:http');

module.exports = function startHTTP(ssbServer) {
  const app = express();
  app.use(express.static(__dirname + '/assets'));
  app.use(require('body-parser').urlencoded({extended: true}));
  app.set('port', 8007);
  app.set('views', __dirname + '/pages');
  app.set('view engine', 'ejs');

  const roomCfgFilePath = path.join(ssbServer.config.path, 'roomcfg');

  app.get('/', (_req, res) => {
    const invite = ssbServer.invite.get();
    const host = ref.parseAddress(ref.parseMultiServerInvite(invite).remote)
      .host;
    const qrCode = qr.svgObject(invite);

    fs.access(roomCfgFilePath, fs.constants.F_OK, doesNotExist => {
      if (doesNotExist) {
        debug('There is no roomname file, ask for setup');
        res.render('setup');
      } else {
        debug('There is a roomcfg file');
        fs.readFile(roomCfgFilePath, {encoding: 'utf-8'}, (err1, rawCfg) => {
          if (err1) debug('ERROR loading roomcfg file');
          const roomConfig = JSON.parse(rawCfg);

          pull(
            ssbServer.tunnel.endpoints(),
            pull.take(1),
            pull.drain(endpoints => {
              res.render('index', {
                host: host,
                name: roomConfig.name,
                description: roomConfig.description,
                onlineCount: (endpoints || {length: 0}).length,
                invite: invite,
                qrSize: qrCode.size,
                qrPath: qrCode.path,
              });
            }),
          );
        });
      }
    });
  });

  app.get('/setup', (req, res) => {
    if (req.query.name) {
      fs.writeFileSync(roomCfgFilePath, JSON.stringify(req.query), {
        encoding: 'utf-8',
      });
      res.redirect('/');
    } else {
      res.render('setup');
    }
  });

  return app.listen(app.get('port'), () => {
    debug('Express app is running on port %s', app.get('port'));
  });
};
