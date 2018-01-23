const path                = require("path");
const webpack             = require("webpack");
const { version }             = require("./package.json");

module.exports = {
  entry: path.join(__dirname, "lib", "index.js"),
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name].js"
  },
  devtool: "source-map",
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: '"webpack"'
      },
      __VERSION__: JSON.stringify(version)
    })
  ],
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
