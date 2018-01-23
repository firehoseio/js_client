const path                = require("path");
const webpack             = require("webpack");

module.exports = {
  entry: path.join(__dirname, "lib", "index.js"),
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name].js",
    library: "Firehose",
    libraryTarget: "umd"
  },
  devtool: "source-map",
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
      { test: /\.json$/, loader: "json-loader" }
    ]
  },
  resolve: {
    alias: {
      "@lib": path.resolve(__dirname, "lib")
    }
  }
};
