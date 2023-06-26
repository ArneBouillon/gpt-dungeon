# GPTDungeon

## Installation
Clone my fork of the `chatgpt-api` repository at https://github.com/ArneBouillon/chatgpt-api. Go to its folder and run
```sh
npm install
npm run build
npm link
```
there.

Then clone this repository. `cd` into it and run
```sh
npm install
rm -rf node_modules/chatgpt
npm link chatgpt
npm run build
```

