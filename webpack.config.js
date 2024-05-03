const webpack = require("webpack");
const path = require("path");
const nodeExternals = require("webpack-node-externals");

const nodeEnv =
  process.env.NODE_ENV === "production" ? "production" : "development";

module.exports = {
  // the project dir
  context: __dirname,
  entry: "./src/index.js",
  target: "node",
  mode: nodeEnv, // 'production' or 'development'

  resolve: {
    extensions: [".js"], // removed the empty string ''
  },

  output: {
    path: path.resolve(__dirname, "dist"),
    library: "webpack-google-cloud-storage-plugin",
    libraryTarget: "umd",
    filename: "webpack-google-cloud-storage-plugin.js",
  },

  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(nodeEnv),
    }),
  ],

  module: {
    rules: [
      // 'rules' replaces both 'loaders' and 'preLoaders'
      {
        enforce: "pre", // 'pre' loader for linting
        test: /\.js$/,
        loader: "eslint-loader",
        include: /src/,
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        include: /src/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"], // Updated to Babel 7
          },
        },
      },
      {
        test: /\.json$/,
        type: "javascript/auto", // Correct handling of JSON in Webpack 4
        use: "json-loader",
      },
    ],
  },
  externals: [
    nodeExternals({
      // 'whitelist' is renamed to 'allowlist'
      allowlist: [/^lodash/, "@google-cloud", "prop-types"],
    }),
  ],
};
