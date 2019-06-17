const fs = require('fs');
const path = require('path');
const express = require('express');
const pull = require('pull-stream');
const debug = require('debug')('ssb:room:http');
const {parseAddress, parseMultiServerInvite} = require('ssb-ref');
const qr = require('qr-image');

function fileExistsSync(filename) {
  try {
    fs.accessSync(filename);
  } catch (err) {
    return false;
  }
  return true;
}

function startHTTPServer(ssb) {
  const app = express();
  app.use(express.static(__dirname + '/assets'));
  app.use(require('body-parser').urlencoded({extended: true}));
  app.set('port', 8007);
  app.set('views', __dirname + '/pages');
  app.set('view engine', 'ejs');

  const roomCfgFilePath = path.join(ssb.config.path, 'roomcfg');

  app.get('/', (_req, res) => {
    if (!fileExistsSync(roomCfgFilePath)) {
      debug('There is no roomcfg file, ask for setup');
      res.redirect('setup');
      return;
    }

    fs.readFile(roomCfgFilePath, {encoding: 'utf-8'}, (err1, rawCfg) => {
      if (err1) debug('ERROR loading roomcfg file');
      const roomConfig = JSON.parse(rawCfg);
      const invite = ssb.invite.get();
      const host = parseAddress(parseMultiServerInvite(invite).remote).host;
      const qrCode = qr.svgObject(invite);

      pull(
        ssb.tunnel.endpoints(),
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
  });

  app.get('/setup', (req, res) => {
    if (fileExistsSync(roomCfgFilePath)) {
      res.redirect('/');
      return;
    }

    if (req.query && req.query.name) {
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
}

module.exports = {
  name: 'roomhttpserver',
  version: '1.0.0',
  manifest: {},
  permissions: {},
  init: startHTTPServer,
};
