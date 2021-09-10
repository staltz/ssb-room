const fs = require('fs');
const path = require('path');
const express = require('express');
const i18n = require('i18n-express')
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
  app.use(
    i18n({
      translationsPath: path.join(__dirname, 'translations'),
      siteLangs: [process.env.PREFERRED_LANGUAGE || 'en', 'pt', 'es'],
      textsVarName: 'translation'
    })
  )
  const roomCfgFilePath = path.join(ssb.config.path, 'roomcfg');

  app.get('/', (req, res) => {
    if (!fileExistsSync(roomCfgFilePath)) {
      debug('There is no roomcfg file, ask for setup');
      res.redirect('setup');
      return;
    }

    fs.readFile(roomCfgFilePath, {encoding: 'utf-8'}, (err1, rawCfg) => {
      if (err1) debug('ERROR loading roomcfg file');
      const roomConfig = JSON.parse(rawCfg);
      let invite = ssb.invite.get();
      let host = parseAddress(parseMultiServerInvite(invite).remote).host;
      if (req.headers && req.headers.host) {
        const requestedHost = req.headers.host.split(':')[0];
        invite = invite.replace(host, requestedHost);
        host = requestedHost;
      }
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

  app.listen(app.get('port'), () => {
    debug('Express app is running on port %s', app.get('port'));
  });

  return {};
}

module.exports = {
  name: 'roomhttpserver',
  version: '1.0.0',
  manifest: {},
  permissions: {},
  init: startHTTPServer,
};
