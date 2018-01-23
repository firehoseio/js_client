const webpackMerge = require("webpack-merge")
const commonConfig = require("./webpack.common.js")
const path                = require("path");
const webpack             = require("webpack");
const CleanWebpackPlugin  = require("clean-webpack-plugin");

module.exports = webpackMerge(commonConfig, {
  entry: {
    firehose: path.join(__dirname, "lib", "index.js"),
    vendor: ["jquery"]
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({name: "vendor", filename: "firehose.vendor.js"}),
    new CleanWebpackPlugin(["dist"], {root: process.cwd()})
  ],
})
