const path         = require("path")
const webpack      = require("webpack")
const version      = require("./package.json").version
const codeName     = require("./package.json")
const isProduction = process.argv.indexOf("-p") !== -1

module.exports = {
  entry: {
    firehose: path.join(__dirname, "lib", "index")
  },

  output: {
    path: path.join(__dirname, "dist"),
    filename: `[name]${isProduction ? ".min" : ""}.js`,
    library: "Firehose",
    libraryTarget: "umd"
  },

  devtool: "source-map",

  plugins: [
    new webpack.DefinePlugin({
      __VERSION__: JSON.stringify(version),
      __CODE_NAME__: JSON.stringify(codeName)
    })
  ],

  resolve: {
    modules: ["node_modules"]
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },

  resolve: {
    extensions: [".js", ".ts"]
  }
};
