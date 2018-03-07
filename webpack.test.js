const webpack = require("webpack")
const webpackMerge = require("webpack-merge")
const commonConfig = require("./webpack.common.js")

delete commonConfig.entry

module.exports = webpackMerge(commonConfig, {
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    })
  ]
})