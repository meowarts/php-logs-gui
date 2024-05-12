## Minimal Electron, React and Webpack boilerplate

Minimal Electron, React, PostCSS and Webpack boilerplate to help you get started with building your next app.

### Table of contents

* [Install](#install)
* [Usage](#usage)
* [Add Sass](#add-sass)

### Install

#### Clone this repo

```
git clone https://github.com/alexdevero/electron-react-webpack-boilerplate.git
```

#### Install dependencies

```
npm install
```
or
```
yarn
```

### Usage

#### Run the app

```
npm run start
```
or
```
yarn start
```

#### Build the app (automatic)

```
npm run package
```
or
```
yarn package
```

#### Build the app (manual)

```
npm run build
```
or
```
yarn build
```

#### Test the app (after `npm run build` || `yarn run build`)
```
npm run prod
```
```
yarn prod
```

### Add Sass

Adding Sass to boilerplate requires updating webpack configs and adding necessary loaders.

1) To `webpack.build.config.js` and `webpack.dev.config.js` add new object to `rules`:

```JavaScript
{
  test: /\.scss$/,
  use: [
    { loader: 'style-loader' },
    { loader: 'css-loader' },
    { loader: 'sass-loader' }],
  include: defaultInclude
}
```

2) Install additional loaders for sass, `sass-loader` and `node-sass`.

3) Rename all CSS file to `.scss`.
