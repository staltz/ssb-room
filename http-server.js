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

function envVarsExist(env) {
  return !!(env && env.SEED && env.NAME);
}

function configExistsSync(env, filename) {
  if (envVarsExist(env)) return true;
  else return fileExistsSync(filename);
}

function loadConfig(env, filename, cb) {
  if (envVarsExist(env)) {
    cb(null, {
      name: env.NAME,
      description: env.DESCRIPTION || '',
    });
  } else {
    fs.readFile(filename, {encoding: 'utf-8'}, (err, rawCfg) => {
      if (err) cb(err);
      else cb(null, JSON.parse(rawCfg));
    });
  }
}

function startHTTPServer(ssb) {
  const app = express();
  app.use(express.static(__dirname + '/assets'));
  app.use(require('body-parser').urlencoded({extended: true}));
  app.set('port', 8007);
  app.set('views', __dirname + '/pages');
  app.set('view engine', 'ejs');

  const roomCfgFilePath = path.join(ssb.config.path, 'roomcfg');

  app.get('/', (req, res) => {
    if (!configExistsSync(process.env, roomCfgFilePath)) {
      debug('There is no room configuration, ask for setup');
      res.redirect('setup');
      return;
    }

    loadConfig(process.env, roomCfgFilePath, (err1, roomConfig) => {
      if (err1) debug('ERROR loading roomcfg file');
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
        pull.drain((endpoints) => {
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
    if (configExistsSync(process.env, roomCfgFilePath)) {
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
