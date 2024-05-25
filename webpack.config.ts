import path from 'path';
import webpack from 'webpack';
import WebpackBar from 'webpackbar';

const config: webpack.Configuration = {
  mode: 'production',
  entry: './src/index.ts',
  target: 'node20',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
    unknownContextCritical: false,
    exprContextCritical: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    clean: true,
  },
  plugins: [new WebpackBar()],
};

export default config;
