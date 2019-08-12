module.exports = function ErrorDuplex(message) {
  const err = new Error(message);
  return {
    source(_abort, cb) {
      cb(err);
    },
    sink(read) {
      read(err, () => {});
    },
  };
};
