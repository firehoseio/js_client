const path = require("path")
const webpackConfig = require("./webpack.test.js")

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: [
      'spec/*_spec.js'
    ],
    preprocessors: {
      'spec/*_spec.js': ['webpack', 'sourcemap']
    },
    webpack: webpackConfig,
    webpackServer: {
      noInfo: true
    },
    reporters: ['dots', 'coverage'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['Chrome', 'ChromeHeadless'],
    singleRun: true,
    concurrency: Infinity,
    coverageReporter: {
      dir: 'tmp/coverage/',
      reporters: [
        {type: 'html', subdir: 'html'},
        {type: 'clover', subdir: '.'}
      ]
    },
  })
}
