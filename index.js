const startSSB = require('./start-ssb');
const startHTTP = require('./start-http');

const ssbServer = startSSB();
startHTTP(ssbServer);
