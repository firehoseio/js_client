path                = require("path")
webpack             = require("webpack")
CleanWebpackPlugin  = require("clean-webpack-plugin")
version             = require("./package.json").version
codeName            = require("./package.json").codeName

module.exports =
  entry:
    firehose: path.join(__dirname, "helpers", "webpack.coffee")
  output:
    path: path.join(__dirname, "dist")
    filename: "[name].js"
  externals:
    # require("jquery") is external and available
    # on the global var jQuery
    "jquery": "jQuery"
  devtool: "source-map"
  plugins: [
    new webpack.DefinePlugin(
      "process.env":
        NODE_ENV: '"webpack"'
      __VERSION__: JSON.stringify(version)
      __CODENAME__: JSON.stringify(codeName)
    )
    new CleanWebpackPlugin ["dist"], root: process.cwd()
  ]
  resolveLoader:
    root: path.join(__dirname, "node_modules")
  module:
    loaders: [
      {
        test: /\.coffee$/
        loader: "coffee-loader"
      }
      {
        test: /\.json$/
        loader: "json-loader"
      }
    ]
  resolve:
    extensions: ["", ".webpack.js", ".web.js", ".js", ".coffee"]
