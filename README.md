# GPTDungeon
The goal of this project is to investigate how to generate a consistent, structured, long-form D&D dungeon module using only the free-form chat functionality of a tool like ChatGPT.

## Installation
Unfortunately, I have had to patch the library used for sending API requests to ChatGPT to support the `continue` action.

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

## Usage and options
The commands above should have built the code. You can now run the program as
```sh
npm run dungeon -- <options>
```
where the `<options>` can be selected from the following table:
| Full name | Short name | Options | Default | Effect |
|---|---|---|---|---|
| `--keywords` | `-k` |  | Randomly generated | The setting of the dungeon will take these keywords into account. |
| `--num-rooms` | `-r` | All numbers (4-8 is recommended) | 8 | This is the number of rooms that will be generated in the dungeon. Currently, all rooms get a lot of content, so using more than 8 rooms is not recommended (both for the dungeon to be runnable in a single session, and for the tool to not get confused due to ChatGPT's limited context size).
| `--combat-difficulty` | `-c` | `'low'`, `'medium'`, `'high'` | Random | This setting determines the difficulty of the enemies that are generated. This option is not all that effective, but can nudge the tool in the right direction. |
| `--loot-value` | `-l` | `'low'`, `'medium'`, `'high'` | Random | This setting determines the value of the items found in the dungeon. The same comments from `combat-difficulty` apply. |
| `--wackiness` | `-w` | `'low'`, `'medium'`, `'high'` | Random | This setting determines how funny or wacky the generated content gets. |
| `--output-name` | `-o` | | Timestamp-based | This setting determines the name of the output MD file and the output layout image. |
| `--abort-on-error` | `-a` | `true`, `false` | `false` | When set to `true`, the tool will abort after encountering errors a certain number of times in a row. When set to `false`, it prompts the user for whether to continue. |

## ChatGPT API
The code uses the `chatgpt-api` NPM package to make API requests to ChatGPT. In `GPTDungeon` code, this is wrapped in an `Asker`. An example is implemented that uses the `ChatGPTUnofficialProxyAPI`; we recommend to instead use the official ChatGPT API, which is both more robust and does not need to rely on a third-party proxy. Implementing an `Asker` for the official API only requires very minor changes to the existing code.


