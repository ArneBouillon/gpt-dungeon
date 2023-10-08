# GPTDungeon
The goal of this project is to investigate how to generate a consistent, structured, long-form D&D dungeon module using only the free-form chat functionality of a tool like ChatGPT. As far as I have been able to find, it is the first project to attempt this.

The techniques used here might also be useful outside the -- admittedly fun -- application area of D&D modules! [Below](#design-challenges) I go into more detail about the main challenges in this project, which would equally pop up in other applications, and how I tried to tackle them.

## Explore the code!
If you're interested in the design of a tool like this, by all means, take a look at [the code](/src/dungeon.ts)! Due to the nature of interacting with ChatGPT (natural language!), much of the code consists of prompt texts, and not much coding knowledge is required to completely follow along with the flow of the code. That way, you can see in practice how I tried to deal with the largest [design challenges](#design-challenges).

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

### Output
Running the code generates two output files: `<output-name>.txt` and `<output-name>.png`. The latter contains a diagram of the room layout of the dungeon. The `.txt` file contains the module in the Brewdown flavour of Markdown, suited to paste into [Homebrewery](https://homebrewery.naturalcrit.com/) to get a nicely formatted module text. Page breaks must be inserted manually, but other than that, text formatting should require minimal manual intervention.

## ChatGPT API
The code uses the `chatgpt-api` NPM package to make API requests to ChatGPT. In `GPTDungeon` code, this is wrapped in an `Asker`. An example is implemented that uses the `ChatGPTUnofficialProxyAPI`; we recommend to instead use the official ChatGPT API, which is both more robust and does not need to rely on a third-party proxy. Implementing an `Asker` for the official API only requires very minor changes to the existing code.

### API token
The under-the-hood use of the ChatGPT API requires an access token. This can be obtained using any of the methods found [here](https://github.com/transitive-bullshit/chatgpt-api#access-token). It should be placed into a new file, created at the root of `gpt-dungeon`'s file system, named `.token`.

### ChatGPT versions
Currently, some queries use the GPT4 model to make use of its extended capabilities and context length. However, if you do not have access to that model, you can simply remove the `'gpt-4'` argument from the second asker's instantiation in `src/dungeon.ts`. **No guarantees are given about the tool's performance without GPT4**; I haven't tested this yet...

## Design challenges
Some challenges that kept popping up during this project, and might do so for people attempting to build a similar tool (potentially in another domain), are summarised here, together with my main strategies for handling them.
- Encourage creativity, but avoid ChatGPT going off the rails and not finishing all aspects of the design process.
	- I developed a rigorous design skeleton (generate lore, propose rooms, distribute loot, generate details, generate units/items in more detail). Finding a good shape for this requires some trial and error.
	- Regularly ground ChatGPT in reality again by forcing it to condense its creative output and bucket it into some categories defined by you. That way, you can use these creative elements later in a controlled way. Your code can tick all the boxes and wrap everything up way better than ChatGPT can!
- Deal with the length limit of a single prompt.
	- The process of generating a dungeon is, of course, divided into many prompts strung together by code. However, sometimes you have to join information from multiple sources into one prompt and it becomes very long. An example is when the precise description of a room is generated; all the generated content of the room and the links to other rooms or elements must be contained in that one prompt!
	- What I have found useful is aggressive compression of the elements feeding into your prompt, but in a controlled way. Firstly, ask ChatGPT to structure each individual text you want to base the prompt on as unstructured bullet points. This drastically reduces the chances of it omitting information when, later, the actual compression step occurs.
	- It is often useful to add a follow-up prompt after the compression step, asking ChatGPT whether it forgot to include any information, and if so, to provide that information as additional bullet points. You'd be surprised how much information loss this extra question prevents!
- All of your design information never fits into ChatGPT's context window. That means you run the risk of "dangling pointers", or references to wrong information. For example, when desigining Room 3 of the dungeon, you don't want ChatGPT to mention that you need a key found in Room 1, even though you didn't place one there before!
	- **Very clearly** delineate the jurisdiction of ChatGPT in response to a given prompt. Plainly tell it that it is the designer of so-and-so, and other elements of the story have designers as well.
	- As earlier, it is entirely valid (and often a good idea) to send follow-up prompts asking ChatGPT to check that it didn't overstep its boundaries by accidentally generating information not restricted to its jurisdiction. Luckily, ChatGPT is clever enough to pick up on most mistakes made like this, and is able to fix them. You just need to ask! Think of it like this: for the first prompt, it had to come up with a bunch of stuff and *remember* that it isn't supposed to do something. In this follow-up prompt, its *only task* is to ensure it stayed within its lane, making it much more perceptive.
	- Of course, we do want some links between the different parts of the generated module! D&D isn't about working away at bite-sized, isolated challenges one at a time, after all. These links are perfectly attainable, but you should look at them as what they really are: a task all on its own. Before generating any of the rooms in detail, I specifically and in detail generate some "inter-room elements". These are first worked out in full, after which ChatGPT is tasked with distilling the responsibilities of each room's designer. These responsibilities are then used in the detailed room generations, and it becomes part of that prompt's jurisdiction to include described links to other rooms.

