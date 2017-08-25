path                = require("path")
webpack             = require("webpack")
version             = require("./package.json").version
isProduction = process.argv.indexOf("-p") != -1

module.exports =
  entry:
    firehose: path.join(__dirname, "lib", "index.js")
  output:
    path: path.join(__dirname, "dist")
    filename: "[name]#{if isProduction then ".min" else ""}.js"
    library: "Firehose"
    libraryTarget: "umd"
  devtool: "source-map"
  plugins: [
    new webpack.DefinePlugin(
      __VERSION__: JSON.stringify(version)
    )
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
