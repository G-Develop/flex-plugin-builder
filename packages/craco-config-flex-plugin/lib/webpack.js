const fs = require('fs');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const appPath = path.join(process.cwd(), 'package.json');
const flexUIPath = path.join(process.cwd(), 'node_modules', '@twilio/flex-ui', 'package.json');
const appPkg = JSON.parse(fs.readFileSync(appPath, 'utf8'));
const flexUIPkg = JSON.parse(fs.readFileSync(flexUIPath, 'utf8'));
const TWILIO_FLEX_VERSION = flexUIPkg.version;

const UNSUPPORTED_PLUGINS = ['SWPrecacheWebpackPlugin', 'ManifestPlugin'];

module.exports = {
  configure: (config, context) => {
    config.output.filename = `${appPkg.name}.js`;
    config.output.chunkFilename = `[name].chunk.js`;
    config.plugins = config.plugins
      .filter(plugin => !UNSUPPORTED_PLUGINS.includes(plugin.constructor.name))
      .map(plugin => {
        if (plugin.constructor.name === 'HtmlWebpackPlugin') {
          plugin.options.inject = false;
          plugin.options.hash = false;
        } else if (plugin.constructor.name === 'InterpolateHtmlPlugin') {
          plugin.replacements = {
            ...plugin.replacements,
            TWILIO_FLEX_VERSION,
          };
        }

        return plugin;
      });

    config.resolve.alias = {
      ...config.resolve.alias,
      '@twilio/flex-ui': 'flex-plugin/dev_assets/flex-shim.js',
    };

    config.externals = {
      'react': 'React',
      'react-dom': 'ReactDOM',
      'redux': 'Redux',
      'react-redux': 'ReactRedux',
    };

    config.plugins.push(new CleanWebpackPlugin({
      cleanAfterEveryBuildPatterns: [
        path.join(process.cwd(), 'build/service-worker.js'),
        path.join(process.cwd(), 'build/precache-manifest*.js'),
        path.join(process.cwd(), 'build/index.html'),
      ],
    }));

    config.optimization.splitChunks = false;
    config.optimization.runtimeChunk = false;

    return config;
  }
};
