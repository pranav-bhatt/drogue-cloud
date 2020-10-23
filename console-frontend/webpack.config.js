const path = require('path');
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const BG_IMAGES_DIRNAME = 'bgimages';

const distPath = path.resolve(__dirname, "dist");
module.exports = (env, argv) => {
    return {
        devServer: {
            contentBase: distPath,
            historyApiFallback: true,
            compress: argv.mode === 'production',
            port: 8010,
            contentBase: [path.join(__dirname,'dev')]
        },
        entry: './main.js',
        output: {
            path: distPath,
            filename: "main.js",
            webassemblyModuleFilename: "main.wasm"
        },
        module: {
            rules: [
                {
                    test: /\.s[ac]ss$/i,
                    use: [
                        'style-loader',
                        'css-loader',
                        'sass-loader',
                    ],
                },
                {
                    test: /\.(svg|ttf|eot|woff|woff2)$/,
                    // only process modules with this loader
                    // if they live under a 'fonts' or 'pficon' directory
                    include: [
                        path.resolve(__dirname, 'node_modules/patternfly/dist/fonts'),
                        path.resolve(__dirname, 'node_modules/@patternfly/patternfly/assets/fonts'),
                        path.resolve(__dirname, 'node_modules/@patternfly/patternfly/assets/pficon')
                    ],
                    use: {
                        loader: 'file-loader',
                        options: {
                            // Limit at 50k. larger files emited into separate files
                            limit: 5000,
                            outputPath: 'fonts',
                            name: '[name].[ext]',
                        }
                    }
                },
                {
                    test: /\.svg$/,
                    include: input => input.indexOf('background-filter.svg') > 1,
                    use: [
                        {
                            loader: 'url-loader',
                            options: {
                                limit: 5000,
                                outputPath: 'svgs',
                                name: '[name].[ext]',
                            }
                        }
                    ]
                },
                {
                    test: /\.svg$/,
                    // only process SVG modules with this loader if they live under a 'bgimages' directory
                    // this is primarily useful when applying a CSS background using an SVG
                    include: input => input.indexOf(BG_IMAGES_DIRNAME) > -1,
                    use: {
                        loader: 'svg-url-loader',
                        options: {}
                    }
                },
                {
                    test: /\.svg$/,
                    // only process SVG modules with this loader when they don't live under a 'bgimages',
                    // 'fonts', or 'pficon' directory, those are handled with other loaders
                    include: input => (
                        (input.indexOf(BG_IMAGES_DIRNAME) === -1) &&
                        (input.indexOf('fonts') === -1) &&
                        (input.indexOf('background-filter') === -1) &&
                        (input.indexOf('pficon') === -1)
                    ),
                    use: {
                        loader: 'raw-loader',
                        options: {}
                    }
                },
                {
                    test: /\.(jpg|jpeg|png|gif)$/i,
                    include: [
                        path.resolve(__dirname, 'src'),
                        path.resolve(__dirname, 'node_modules/patternfly'),
                        path.resolve(__dirname, 'node_modules/@patternfly/patternfly/assets/images'),
                        path.resolve(__dirname, 'node_modules/@patternfly/react-styles/css/assets/images'),
                        path.resolve(__dirname, 'node_modules/@patternfly/react-core/dist/styles/assets/images'),
                        path.resolve(__dirname, 'node_modules/@patternfly/react-core/node_modules/@patternfly/react-styles/css/assets/images'),
                        path.resolve(__dirname, 'node_modules/@patternfly/react-table/node_modules/@patternfly/react-styles/css/assets/images'),
                        path.resolve(__dirname, 'node_modules/@patternfly/react-inline-edit-extension/node_modules/@patternfly/react-styles/css/assets/images')
                    ],
                    use: [
                        {
                            loader: 'url-loader',
                            options: {
                                limit: 5000,
                                outputPath: 'images',
                                name: '[name].[ext]',
                            }
                        }
                    ]
                }
            ],
        },
        plugins: [
            new CopyWebpackPlugin([
                { from: './static', to: distPath }
            ]),
            new WasmPackPlugin({
                crateDirectory: ".",
                extraArgs: "--no-typescript",
            })
        ],
        watch: argv.mode !== 'production'
    };
};