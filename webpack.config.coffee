path                = require("path")
webpack             = require("webpack")
CleanWebpackPlugin  = require("clean-webpack-plugin")
version             = require("./package.json").version

module.exports =
  entry:
    firehose: path.join(__dirname, "helpers", "webpack.coffee")
    vendor: ["jquery"]
  output:
    path: path.join(__dirname, "dist")
    filename: "[name].js"
  devtool: "source-map"
  plugins: [
    new webpack.DefinePlugin(
      "process.env":
        NODE_ENV: '"webpack"'
      __VERSION__: JSON.stringify(version)
    )
    new webpack.optimize.CommonsChunkPlugin({ name: 'vendor', filename: 'firehose.vendor.js' })
    new CleanWebpackPlugin ["dist"], root: process.cwd()
  ]
  resolve:
    modules: ["node_modules"]
  module:
    rules: [
      {
        test: /\.coffee$/
        use: "coffee-loader"
      }
      {
        test: /\.json$/
        use: "json-loader"
      }
    ]
  resolve:
    extensions: [".js", ".coffee"]
