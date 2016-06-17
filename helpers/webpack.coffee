Firehose = require "../lib/firehose"

if typeof module == "object" && typeof module.exports == "object"
  module.exports = Firehose
else
  window.Firehose = Firehose
