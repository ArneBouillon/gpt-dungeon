import * as graph from './graph.js'
import * as hb from './homebrewery.js'
import * as util from './util.js'

import assert from 'assert'
import * as fs from 'fs'

const asker = new util.ChatGPTAsker()

const THREAD_KEYWORDS = 'kw'
const THREAD_CONTEXT = 'context'

const THREAD_MAIN = 'main'
const THREAD_MAIN2 = 'main2'

function preprocessName(str) {
    return str.toLowerCase().replaceAll(/(the|a|an|\(.+\))/g, '').trim()
}

const messageKeywords =
    "Give me three randomly picked nouns or adjectives. Ensure the words are very concrete and not too abstract. " +
    "Also ensure none of the words include anything modern. Answer with a comma-separated list, and no other text."
const { text: keywords } = await asker.ask(THREAD_KEYWORDS, messageKeywords)

const messageDungeon =
    "We are going to design a D&D dungeon (not necessarily a literal dungeon) for third-level characters. " +
    "We will take things step-by-step, going from a high abstraction level to a lower one. " +
    "First, give ONE suggestion for the setting and nature of the dungeon. " +
    "Make sure to be creative and use lots of colorful language. " +
    "Include the location/building the characters will explore and a brief description of the setting " +
    "(inhabitants, context, positioning) of the place. Ensure to keep the scope very limited. " +
    "The less larger narrative there is to the story, the better. " +
    "BE CREATIVE AND DON'T STICK TO CLICHES! ANSWER IN A SINGLE SENTENCE. " +
    `Use the following keywords: ${keywords}`
const { text: dungeon } = await asker.ask(THREAD_MAIN, messageDungeon)

const messageHistory =
    "That sounds awesome! Now, very concisely suggest the history of this location. When mentioning people or " +
    "locations, use concrete names. Be as specific as possible."
const { text: history } = await asker.ask(THREAD_MAIN, messageHistory)

const messageMission =
    "Great! Now we need to add some meat to the story. On a high level, what will be the characters' mission? " +
    "Suggest a BRIEF, SELF-CONTAINED goal WITH A SMALL SCOPE that can be managed in a single session. " +
    "Do not yet mention their motivation for this goal. BE CREATIVE AND DON'T STICK TO CLICHES!"
const { text: mission } = await asker.ask(THREAD_MAIN, messageMission)

const messageContext =
    "Summarize neatly into a single text. DO NOT LOSE INFORMATION.\n\n" +
    `${dungeon}\nIts history is summarized as follows. ${history}\n` +
    `The characters' mission is the following. ${mission}.`
const { text: context } = await asker.ask(THREAD_CONTEXT, messageContext)

const messageMotivations =
    "That sounds good. Now suggest a few potential interesting motivations for the characters to do this. " +
    "Don't propose too many. ANSWER ONLY WITH A NUMBERED LIST OF MOTIVATIONS; NO OTHER TEXT."
const { text: motivations } = await asker.ask(THREAD_MAIN, messageMotivations)

const messageChallenges =
    "Great. Now we should identify the main challenges in this dungeon. Select three main challenges that " +
    "the characters will have to contend with. Ensure a good mix that might include fights, puzzles, traps... " +
    "DON'T STICK TO CLICHES!"
const { text: challenges } = await asker.ask(THREAD_MAIN, messageChallenges)

const messageChallengesElaborated =
    "Now repeat the three main challenges you just gave me, keeping the relevant information that was there, " +
    "but add the following. If the challenge is a combat encounter, detail precisely the types and numbers of enemies " +
    "(no stats yet!). If the challenge requires D&D in-game mechanics to be meaningful " +
    "(such as challenges that relate to a hostile environment), detail VERY SPECIFICALLY how it would work in-game."
const { text: challengesElaborated } = await asker.ask(THREAD_MAIN, messageChallengesElaborated)

const messageRooms =
    `We are designing a D&D dungeon. The context is as follows: ${context}` +
    `\n\nThe three main challenges for the players will be:\n${challengesElaborated}\n\n` +
    "Propose 6 rooms into which to divide the dungeon. Start with just a high-level description. Make all the rooms " +
    "interesting, although they do not all need to be action-packed. Ensure the three challenges from above are all " +
    "accounted for somehow. The first room should be the characters' entry into the dungeon."
const { text: rooms } = await asker.ask(THREAD_MAIN2, messageRooms)
const roomsList: string[] = rooms.split('\n').map((room) => room.match(/\s*\d\d?.?\s*(.*)\s*/)?.[1]).filter(room => room).map(room => room!)
console.log(roomsList)
assert(roomsList.length == 6)

const rawRoomNames = roomsList.map(room => room.match(/^(.+?):/)?.[1])
const roomNames = rawRoomNames.map(room => preprocessName(room))
console.log(roomNames)

const messageLayout =
    "What should be the layout of these rooms? The layout must serve two goals: " +
    "it should provide an exciting adventure with well-paced action and excitement building, " +
    "but it should not feel railroaded. Please suggest how the 6 rooms mentioned earlier could be connected. " +
    "Where possible, give the characters the freedom to choose multiple paths, although you should not sacrifice the story for that. " +
    `Be concise in your answer and do not repeat the room descriptions. Instead, REFER TO THE ROOMS ABOVE (${rawRoomNames.join(', ')}) BY NAME. ` +
    "ENSURE EVERYTHING MAKES LOGICAL SENSE AND THE CHARACTERS CAN EXPLORE THE ENTIRE DUNGEON WITHOUT GETTING STUCK! " +
    "ONLY MENTION THE LAYOUT."
const { text: layout } = await asker.ask(THREAD_MAIN2, messageLayout)

const messageConnections =
    "Repeat your full last message, but anytime you introduce a connection between two rooms, " +
    `mark it with [Connection: Room 1 <-> Room 2]. Start a new mark for each connection. ` +
    `Only use this mark with the 6 rooms you proposed above (${rawRoomNames.join(', ')}), ` +
    "and MAKE SURE ALL CONNECTIONS ARE MARKED! ONLY ADD MARKS FOR THE 6 ROOMS!"
const { text: connections } = await asker.ask(THREAD_MAIN2, messageConnections)

const messageConnectionsMissed =
    "Are there any marks you missed? Give them here. Again, give a SEPARATE mark for each connection! " +
    `ONLY add marks for the rooms ${rawRoomNames.join(', ')}.` // TODO: It still sometimes misses some... It might help to state explicitly here that it should NOT repeat the rest of the text, as that might be linked.
const { text: connectionsMissed } = await asker.ask(THREAD_MAIN2, messageConnectionsMissed)

const numberConnections = [...(connections + connectionsMissed)
    .matchAll(/\[[cC]onnection:\s?(.+?)\s?<?->\s?(.+?)\s?]/g)]
    .filter(
        match => match[1].toLowerCase() != "room 1"
    ).map(
        match => {
            const numbers = [roomNames.indexOf(preprocessName(match[1])) + 1, roomNames.indexOf(preprocessName(match[2])) + 1]
            console.log(preprocessName(match[1]))
            console.log(preprocessName(match[2]))
            // assert(numbers[0] >= 1 && numbers[1] >= 1)
            return numbers
        }
    ).filter(
        numbers => {
            if (numbers[0] < 0 || numbers[1] < 0) {
                console.log("WARNING: Incorrect mark")
                return false
            }

            return true
        }
    )
graph.makeUndirectedGraph([1, 2, 3, 4, 5, 6], numberConnections)

const messageRoomSummaries =
    `${roomsList.join('\n')}\n\nRecall these rooms. Now state for each room:\n` +
    "- The overall amount of content in this room (low/medium/high). Ensure a good mix of this.\n" +
    "- The types of content present in this room (loot/combat/social/...)\n" +
    "- A bit more detail about the content. Keep it at the conceptual level; conciseness is important.\n\n" +
    "Separate each room's text with three dashes: ---. Reply with ONLY THE 6 ROOMS. " +
    "I'm looking for a dungeon light on puzzles, medium on combat and high on loot." // TODO: Temporary
const { text: roomSummaries } = await asker.ask(THREAD_MAIN2, messageRoomSummaries)
const roomSummariesList = roomSummaries.split('---').map(room => room.trim()).filter(room => room)
console.log(roomSummariesList)
assert(roomSummariesList.length >= 6) // TODO: Check that if it's more, it's just bc some note was put after it

let roomTexts: string[] = []
for (let roomNumber = 1; roomNumber <= 6; ++roomNumber) {
    const thread = `room${roomNumber}`

    const messageRoom =
        `We are designing a D&D dungeon. The context is as follows: ${context} ` +
        `\n\nThe room I would like to design in more detail is the following: ${roomSummariesList[roomNumber - 1]}\n\n` +
        "Please propose a detailed description of this room. Feel free to add small things such as decorations, " +
        "minor loot... but nothing too big. " +
        "I'm looking for a room with a fair amount of loot and a lot of potential interactions with items. " + // TODO: Temporary
        "I'm looking for a room low on puzzles and riddles. Don't overcomplicate things, although you can be creative. " + // TODO: Temporary
        "Do not introduce items (such as keys) for use later in the dungeon; focus purely on this room and the prompt you're given." // TODO: Temporary
    const { text: roomDetail } = await asker.ask(thread, messageRoom)

    const messageRoomText =
        "The ideas above are very interesting, but the text is not yet suited for an entry in a D&D module. " +
        "Overhaul the text to be concise and informative, containing all the information needed for the DM to run the session, " +
        "AND NOTHING MORE. If the room contains enemies, do not describe them in any detail. WRITE IN THE STYLE OF A D&D MODULE! \n" +
        "- Start with a description for the players (between backticks) describing what they see, and the ambiance of the room.\n" +
        "- Then give a description of the room.\n" +
        "- Give a list of notable features (and describe in detail potential mechanics implications). \n" +
        "- If there are puzzles, add a puzzle section. If not, DO NOT ADD A PUZZLE SECTION.\n" +
        "- Add a loot section.\n" +
        "\n" +
        "If you mention puzzles or loot, make sure you describe them in full detail, either within or after the features section.\n" +
        "\n" +
        "Note that this is meant for a DM; BE CONCISE, PRECISE, SPECIFIC AND COMPLETE in anything you say. " +
        "ONLY LIST SPECIFIC IN-GAME INFORMATION, NO GENERALITIES OR DM TIPS. List specifically what loot can be found, " +
        "what the precise solution to a puzzle is, how concepts translate to in-game mechanics... " +
        "Answer in the style of a Homebrewery Markdown (Brewdown) module."
    const { text: roomText1 } = await asker.ask(thread, messageRoomText)

    const clarificationThread = `room${roomNumber}_c`

    const messageUnclear =
        `${roomText1}\n\n----------\n\n` +
        "The above section is meant to feature in a D&D module, and the DM uses the text to run the module. " +
        "However, the text is not yet specific enough, often giving examples instead of citing what exactly the characters encounter. " +
        "Identify all the elements that are not yet specific enough for a DM to properly run the adventure. " +
        "Pay special attention to whether the characters have all the information and clues needed to progress. " +
        "DO NOT INCLUDE ELEMENTS THAT WILL LIKELY BE DETAILED IN LATER PARTS OF THE ADVENTURE, such as other rooms or story elements.\n\n" +
        "DO NOT PROPOSE TO ADD NEW ELEMENTS! ONLY ELABORATE ON EXISTING ELEMENTS. BE CONCISE. Give a list of unclear elements."
    await asker.ask(clarificationThread, messageUnclear)
    const messageUnclearFilter =
        "Repeat the unclear elements, but leave out those relating to the overarching story instead of to this specific " +
        "room in the dungeon. Answer with just a numbered list, nothing else."
    const { text: unclearText } = await asker.ask(clarificationThread, messageUnclearFilter)

    const messageClarify =
        "Please fill in the specifics of the points left unclear, bearing in mind that the adventure is meant for characters of level 3, " +
        "meaning everything should be balanced for level 3. DO NOT INTRODUCE ADDITIONAL CONTENT OR NPCs by doing this, " +
        "but just ensure the story is concrete and logical. DO NOT INTRODUCE NEW COMBAT OR NPCs! " +
        "I REPEAT: NO NEW COMBAT OR NPCs! Make sure it is clear how the characters should acquire any potential clues. " +
        "Answer with just a numbered list, nothing else."
    const { text: clarifications } = await asker.ask(clarificationThread, messageClarify)

    const extractionThread = `room${roomNumber}_extract`

    const messageExtract =
        `${roomDetail}\nClarifications:\n${clarifications}\n\n----------\n\n` +
        'From this text, extract:\n' +
        '- Items, if they would benefit from a separate entry (e.g. due to a magic effect or some other unusual quality)\n' +
        '- All creatures that are mentioned\n' +
        '-  Spells ONLY if they are on a scroll found in the room.\n\n' +
        'Answer in three lines (e.g. "Items: ..."), each containing a concise comma-separated list. ' +
        'Only include names, no details. If nothing matches a given category, put "N/A" there.'
    const { text: extractionText } = await asker.ask(extractionThread, messageExtract)

    const messageExtractedEntries =
        "For each of these elements, provide a STANDARD D&D module entry in Markdown (Brewdown) style, using #### for " +
        "the title. For items, ensure to list at least their weight, value and properties; for spells, their effects; " +
        "and for enemies a COMPLETE STAT BLOCK. Enemies need a slightly different format: they are started by {{monster,frame " +
        "and ended by }}. Within this block, the title uses ## and subtitles ###.\n\n" +
        "FOR EACH OF THE ITEMS ABOVE, PROPOSE AN ENTRY FOLLOWING THE ABOVE RULES. REPLY WITH ONLY THE ENTRIES, " +
        "separated by three dashes: ---."
    const { text: extractedEntries } = await asker.ask(extractionThread, messageExtractedEntries)

    const finalThread = `room${roomNumber}_f`

    const messageClarifiedRoom =
        `${roomDetail}\nClarifications:\n${clarifications}\n\n----------\n\n` +
        "The ideas above are very interesting, but the text is not yet suited for an entry in a D&D module. " +
        "Overhaul the text to be concise and informative, containing all the information needed for the DM to run the session, " +
        "AND NOTHING MORE. If the room contains enemies, do not describe them in any detail. WRITE IN THE STYLE OF A D&D MODULE! \n" +
        "- Start with a description for the players (between backticks) describing what they see, and the ambiance of the room.\n" +
        "- Then give a description of the room.\n" +
        "- Give a list of notable features (and describe in detail potential mechanics implications). \n" +
        "- If there are puzzles, add a puzzle section. If not, DO NOT ADD A PUZZLE SECTION.\n" +
        "- Add a loot section.\n" +
        "\n" +
        `When mentioning ANY OF:\n${extractionText}\n, do not provide any explanation about them, ` +
        "as that will be done somewhere else. Simply PRINT THE NAMES IN **BOLD**.\n" +
        "\n" +
        "Note that this is meant for a DM; BE CONCISE, PRECISE, SPECIFIC AND COMPLETE in anything you say. " +
        "ONLY LIST SPECIFIC IN-GAME INFORMATION, NO GENERALITIES OR DM TIPS. List specifically what loot can be found, " +
        "what the precise solution to a puzzle is, how concepts translate to in-game mechanics... " +
        "Answer in the style of a Homebrewery Markdown (Brewdown) module."
    const { text: clarifiedRoomText } = await asker.ask(finalThread, messageClarifiedRoom)

    roomTexts.push(clarifiedRoomText + '\n\n' + extractedEntries)
}

const titleText =
    "Propose a title for this adventure. STATE ONLY THE TITLE ITSELF, NO EXTRA TEXT."
const { text: rawTitle } = await asker.ask(THREAD_MAIN, titleText)
const title = rawTitle.replaceAll(/["'.]/g, '')

const roomSections = roomTexts

const motivationSection =
    `## Motivation\nThere are many reasons why the PCs might embark on this quest. Some examples are given.\n\n${motivations}`

const layoutSection =
    `## Dungeon layout\nThe dungeon's rooms are laid out as follows.\n\n![layout](TODO) {width:325px,mix-blend-mode:multiply}`

const sections = [motivationSection, layoutSection, ...roomSections]
const hbText = hb.getMD(title, context, sections)
console.log(hbText)
fs.writeFileSync('output.txt', hbText)
