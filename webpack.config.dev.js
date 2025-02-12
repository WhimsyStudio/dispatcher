const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  entry: './src/app.ts',
  output: {
    filename: 'app.js',
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
        use: ['worker-loader', 'babel-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Dispatcher',
      template: './src/index.html',
      favicon: './src/favicon.ico',
    }),
  ],
  resolve: {
    alias: {
      '@wsys': path.resolve(__dirname, 'src', 'lib'),
    },
    extensions: ['.ts', '.js', '.json'],
  },
};
