const HTMLWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

module.exports = {
  plugins: [
    new HTMLWebpackPlugin({
      template: path.resolve(__dirname, './src', 'index.html'),
    }),    
  ],
  output: { 
    path: path.resolve(__dirname, './docs'),
    filename: 'main.js' 
  },
  entry: { 
    index: path.resolve(__dirname, './src', 'index.js') 
  },
}