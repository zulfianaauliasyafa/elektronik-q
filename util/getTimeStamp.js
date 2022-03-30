module.exports = function getTimestamp(id) {
  return new Date(parseInt(id.slice(0,8), 16)*1000);
}
