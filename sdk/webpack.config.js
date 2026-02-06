const path = require('path');

module.exports = {
  entry: './src/payment-sdk.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'pso-sdk.js',
    library: 'PSOPayment',
    libraryTarget: 'umd',
    libraryExport: 'default',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  mode: 'production'
};
