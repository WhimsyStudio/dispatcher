const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  entry: {
    index:'./src/test/basic/index.ts',
  },
  output: {
    filename: '[name].[hash].js',
  },
  optimization: {
    minimize: false,
  },
  devServer: {
    open: false,
    hot: true,
    host: 'localhost',
    port: 9000,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.([mjt])s$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.worker\.(js|ts)$/,
        exclude: /(node_modules|bower_components)/,
        use: [
          {
            loader: 'worker-loader',
            options: {
              filename: '[name].[contenthash].js', 
              inline: 'fallback',
            },
          },
          'babel-loader',
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Dispatcher',
      template: './src/index.html',
      inject: true,
      filename:'basic.html',
      chunks: ['index']
    }),
  ],
  resolve: {
    alias: {
      '@wsys': path.resolve(__dirname, 'src', 'lib'),
    },
    extensions: ['.ts', '.js', '.json'],
  },
};
