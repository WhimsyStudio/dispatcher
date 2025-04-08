const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const packageInfo = require('./package.json');
const { version, name, license, repository, author } = packageInfo;
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { merge } = require('webpack-merge');

const banner = `
  ${name} v${version}
  ${repository.url}

  Copyright (c) ${author.replace(/ *<[^)]*> */g, ' ')}.

  This source code is licensed under the ${license} license.
`;

const common = {
  mode: 'production',
  devtool: 'source-map',
  entry: './src/lib/dispatcher/index.ts',

  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      parallel: 4,
      extractComments: false,
      terserOptions: {
        format: {
          comments: /@wsys\/dispatcher/
        },
      }
    })],
  },
 
  plugins: [new webpack.BannerPlugin(banner)],
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: path.resolve(__dirname, 'tsconfig.build.json'),
      }),
    ],
  },
};
const umd = {
  output: {
    filename: 'index.umd.js',
    path: path.resolve(__dirname, 'build/@wsys/dispatcher/dist'),
    library: 'Dispatcher',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.([mjt])s$/,
        exclude: [
          /(node_modules|bower_components)/,
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-typescript'
            ]
          }
        },
      },
    ],
  },
} 
const esm = {
  experiments: {
    outputModule: true 
  },
  output: {
    filename: 'index.esm.js',
    path: path.resolve(__dirname, 'build/@wsys/dispatcher/dist'),
    library: {
      type: 'module'
    },
  },
  module: {
    rules: [
      {
        test: /\.([mjt])s$/,
        exclude: [
          /(node_modules|bower_components)/,
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
               ['@babel/preset-env', { modules: false }], 
              '@babel/preset-typescript'
            ]
          }
        },
      },
    ],
  },
}
const umdConfig = merge(common,umd)
const esmConfig = merge(common,esm)
module.exports = [umdConfig,esmConfig];
