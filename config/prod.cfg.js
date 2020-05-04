const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const baseConfig = require('./base.cfg');

const PAGES = fs
  .readdirSync('src/')
  .filter(fileName => fileName.endsWith(".html"))
  .map(
    page =>
      new HtmlWebpackPlugin({
        filename: `${page}`,
        template: path.join(__dirname, `../src/${page}`),
        inject: true,
        minify: {
          removecomments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true,
        }
      })
  );

const imagesLoader = filepath => {
  return [
    {
      loader: 'file-loader',
      options: {
        context: path.resolve(__dirname, '../src/'),
        name: filepath
      }
    },
    {
      loader: 'image-webpack-loader',
      query: {
        gifsicle: {
          interlaced: false
        },
        optipng: {
          optimizationLevel: 7
        },
        pngquant: {
          quality: [0.65, 0.90],
          speed: 4
        },
        mozjpeg: {
          progressive: true,
          quality: 65
        },
        webp: {
          quality: 75
        }
      }
    }
  ];
};

const styleLoaders = ext => {
  const loaders = [
    {
      loader: MiniCssExtractPlugin.loader,
      options: {
        publicPath: '../'
      }
    },
    'css-loader',
    {
      loader: 'postcss-loader',
      options: {
        // sourceMap: true,
        plugins: (loader) => [
          require('autoprefixer')({
            grid: true
          }),
          require('css-mqpacker')({
            sort: sortMediaQueries
          })
        ]
      }
    }
  ];

  if (ext) {
    loaders.push(ext);
  }

  return loaders;
};

module.exports = merge(baseConfig, {
  mode: 'production',
  // devtool: 'source-map',
  optimization: {
    minimize: true,
    runtimeChunk: false,
    minimizer: [
      new TerserPlugin({
        test: /\.js$/,
        terserOptions: {
          warnings: false,
          compress: {
            pure_getters: true,
            unsafe_proto: true,
            passes: 3,
            join_vars: true,
            sequences: true
          },
          mangle: true
        },
        parallel: true,
        cache: true
      })
    ],
    splitChunks: {
      chunks: 'async',
      minSize: 1000,
      minChunks: 2,
      maxAsyncRequests: 5,
      maxInitialRequests: 3,
      name: true,
      cacheGroups: {
        default: {
          minChunks: 1,
          priority: -20,
          reuseExistingChunk: true
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10
        }
      }
    }
  },
  plugins: [
    ...PAGES,
    new ScriptExtHtmlWebpackPlugin({
      async: /ASYNCSCRIPT.*.js$/,
      // sync: 'SYNCSCRIPT.[hash:7].js',
      defaultAttribute: 'sync'
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery'
    }),
    new MiniCssExtractPlugin({
      filename: 'css/bundle.[hash:7].css',
      disable: false,
      allChunks: true
    }),
    new OptimizeCssAssetsPlugin({
      cssProcessor: require('cssnano'),
      cssProcessorOptions: {
        safe: true,
        discardComments: { removeAll: true }
      }
    }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new CopyWebpackPlugin([
      {
        from: path.resolve(__dirname, '../src/images/favicons'),
        to: path.resolve(__dirname, '../dist')
      }
    ], {
      ignore: [
        '*.svg',
        '.gitkeep'
      ],
      copyUnmodified: true
    })
  ],
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|ico|webp)$/,
        exclude: /(node_modules|bower_components)/,
        use: imagesLoader('[path][name].[hash:7].[ext]')
      },
      {
        test: /\.(png)$/,
        include: /(node_modules|bower_components)/,
        use: imagesLoader('images/[name].[hash:7].[ext]')
      },
      {
        test: /\.(css)$/,
        use: styleLoaders()
      },
      {
        test: /\.(sass|scss)$/,
        use: styleLoaders('sass-loader')
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env']
          }
        }
      }
    ]
  }
});

function isMax(mq) {
  return /max-width/.test(mq);
}

function isMin(mq) {
  return /min-width/.test(mq);
}

function sortMediaQueries(a, b) {
  A = a.replace(/\D/g, '');
  B = b.replace(/\D/g, '');

  if (isMax(a) && isMax(b)) {
    return B - A;
  } else if (isMin(a) && isMin(b)) {
    return A - B;
  } else if (isMax(a) && isMin(b)) {
    return 1;
  } else if (isMin(a) && isMax(b)) {
    return -1;
  }
  return 1;
}
