const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const packageInfo = require('./package.json');
const { version, name, license, repository, author } = packageInfo;

const banner = `
  ${name} v${version}
  ${repository.url}

  Copyright (c) ${author.replace(/ *<[^)]*> */g, ' ')}.

  This source code is licensed under the ${license} license.
`;

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  entry: './src/lib/dispatcher/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist/@wsys/dispatcher'),
    library: name,
    libraryTarget: 'umd',
    clean: true,
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({ extractComments: false })],
  },
  module: {
    rules: [
      {
        test: /\.([mjt])s$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  plugins: [new webpack.BannerPlugin(banner)],
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
};
