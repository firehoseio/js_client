const webpack = require("webpack")
const webpackMerge = require("webpack-merge")
const commonConfig = require("./webpack.common.js")

delete commonConfig.entry

for (let rule of commonConfig.module.rules) {
  if (rule.use && rule.use.loader === 'babel-loader') {
    if (!rule.use.options) {
      rule.use.options = {}
    }
    if (!rule.use.options.plugins) {
      rule.use.options.plugins = []
    }
    rule.use.options.plugins.push(['istanbul', { 'exclude': [ 'spec/', 'vendor/' ] }])
  }
}

module.exports = webpackMerge(commonConfig, {
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    })
  ]
})
