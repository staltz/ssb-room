const {isAddress} = require('ssb-ref');

const SEED = 'SSB+Room+PSK3TLYC2T86EHQCUHBUHASCASE18JBV24=';

function isInvite(invite) {
  if (typeof invite !== 'string') return false;
  if (!invite) return false;
  if (!invite.endsWith(':' + SEED)) return false;
  const addr = invite.split(':' + SEED)[0];
  if (!addr) return false;
  if (!isAddress(addr)) return false;

  return true;
}

function addressToInvite(addr) {
  return addr + ':' + SEED;
}

function inviteToAddress(invite) {
  if (!isInvite(invite)) return null;
  return invite.split(':' + SEED)[0];
}

module.exports = {addressToInvite, inviteToAddress, isInvite, SEED};
