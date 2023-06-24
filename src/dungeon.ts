import * as graph from './graph.js'
import * as hb from './homebrewery.js'
import * as util from './util.js'

import assert from 'assert'
import * as fs from 'fs'
import { getTempThread } from "./util.js"

import process from 'node:process'
import { parseArgs } from 'node:util'

process.on('exit', (code) => {
    console.log(`About to exit with code: ${code}`)
    console.log(new Error().stack)
})

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled rejection at:', promise, 'reason:', reason)
    console.log(new Error().stack)
})

const asker = new util.ChatGPTAsker()

// const fancyAsker = new util.PromptAsker()
const fancyAsker = new util.ChatGPTAsker('gpt-4')

const THREAD_MAIN = 'main'
const THREAD_LORE = 'lore'

function randomChoice(arr) {
    return arr[Math.floor(arr.length * Math.random())];
}

function onlyBullets(text) {
    let res = text.trim()
    let lines = res.split('\n')
    if (res.includes('- ') && res[0] != '-') {
        res = lines.slice(1).join('\n').trim()
        lines = res.split('\n')
    }
    if (lines.length > 1 && lines[lines.length - 2].trim() == '' && lines[lines.length - 1].trim()[0] != '-') {
        res = lines.slice(0, -2).join('\n').trim()
    }

    return res
}

const { values: givenOptions } = parseArgs({ args: process.argv.slice(2), options: {
    keywords: { type: "string", short: "k" },
    numRooms: { type: "string", short: "r" },
    combatDifficulty: { type: "string", short: "c" },
    lootValue: { type: "string", short: "l" },
    wackiness: { type: "string", short: "w" },
    outputName: { type: "string", short: "o" },
} })
const options = {
    keywords: givenOptions.keywords || null,
    numRooms: Number(givenOptions.numRooms) || 8,
    combatDifficulty: givenOptions.combatDifficulty || randomChoice(["low", "medium", "high"]),
    lootValue: givenOptions.lootValue || randomChoice(["low", "medium", "high"]),
    wackiness: givenOptions.wackiness || randomChoice(["low", "medium", "high"]),
    outputName: givenOptions.outputName || new Date().toISOString().replaceAll(/:T/g, '-').replace(/\..+/, '')
}

const combatModifier =
    options.combatDifficulty == 'low' ?
        'make combat fairly easy for level-3 characters' :
        options.combatDifficulty == 'medium' ?
            'keep in mind that the characters are level-3' :
            'introduce enemies that are HOSTILE AND VERY POWERFUL COMPARED TO LEVEL-3 characters'

const lootModifier =
    options.lootValue == 'low' ?
        ' Valuable loot should be rare.' :
        options.lootValue == 'medium' ?
            '' :
            ' Loot should be fairly valuable and plentiful.'

const wackyModifier =
    options.wackiness == 'low' ?
        ' Keep everything rather grounded and do not introduce anything weird or frivolous.' :
        options.wackiness == 'medium' ?
            '' :
            ' Some of the things you introduce should be somewhat weird, funny, or wacky.'

const messageDungeon =
    "We are going to design a D&D dungeon (not necessarily a literal dungeon) for third-level characters. " +
    "We will take things step-by-step, going from a high abstraction level to a lower one. " +
    "First, give ONE suggestion for the setting and nature of the dungeon. " +
    "Make sure to be creative and use lots of colorful language. " +
    "Include the location/building the characters will explore and a brief description of the setting " +
    "(inhabitants, context, positioning) of the place. Ensure to keep the scope very limited. " +
    "The less larger narrative there is to the story, the better. " +
    "BE CREATIVE AND DON'T STICK TO CLICHES! ANSWER IN A SINGLE SENTENCE." +
    (options.keywords ? ` Use the following keywords: ${options.keywords}` : '')
const { text: dungeon } = await asker.ask(THREAD_MAIN, messageDungeon)

const messageHistory =
    "That sounds awesome! Now, very concisely suggest the history of this location. When mentioning people or " +
    "locations, use concrete names. Be as specific as possible."
const { text: history } = await asker.ask(THREAD_MAIN, messageHistory)

const messageLore =
    `${dungeon}\n${history}\n\n---------\n\n` +
    "Develop a full lore about this location. Focus primarily on the current state of the location, " +
    "its potential inhabitants, and the secrets hidden within. Be very information-dense! " +
    `Do not overcomplicate things and keep everything self-contained.${wackyModifier} ` +
    "Ensure to include 1 secret that visiting adventurers could discover. Write densely."
const { text: lore } = await fancyAsker.ask(THREAD_LORE, messageLore)

const missionThread = util.getTempThread()
const messageMission =
    `${lore}\n\n---------\n\nI want to use this location as a D&D dungeon for level-3 characters. ` +
    "Propose a high-level mission for characters venturing into the above location. " +
    "Suggest a BRIEF, SELF-CONTAINED goal that can be managed in a single session. " +
    "Do not yet mention their motivation for this goal. Use elements from the above lore! Answer with a single sentence."
const { text: mission } = await asker.ask(missionThread, messageMission)

const messageContext =
    "Summarize both the lore above and the mission statement into a short background text that would be helpful for designers of the dungeon."
const { text: context } = await asker.ask(missionThread, messageContext)

const messageMotivations =
    "Now suggest a few interesting potential motivations for the characters to accept and complete this mission. " +
    `Make them very specific and concrete!${wackyModifier} Don't propose too many. ANSWER ONLY WITH A NUMBERED LIST OF MOTIVATIONS; NO OTHER TEXT.`
const { text: motivations } = await asker.ask(missionThread, messageMotivations)

const numRoomsEnemy = (options.combatDifficulty == 'medium' ? 1 : 0)
    + (options.combatDifficulty == 'high' ? 2 : 0)
    + (options.numRooms - options.numRooms % 4) / 4

let roomsText = ''
for (let roomBatch = 1; roomBatch <= Math.ceil(options.numRooms / 3); ++roomBatch) {
    const messageRooms =
        roomBatch == 1
            ?
            "The above location is used as a D&D dungeon. " +
            `The characters' mission is the following. ${mission}\n\n` +
            `Propose ${options.numRooms} distinct and unique rooms in which to divide the dungeon. They should culminate in an opportunity to complete the above mission. ` +
            "For each room, discuss\n" +
            "- The general setting and atmosphere of the room. Also briefly describe the main features or distinctive elements.\n" +
            "- Anything present in the room that relates to the lore of the location and/or the story of the adventure. Be detailed and specific!\n" +
            "  -> Story-related items, if present.\n" +
            `  -> Major loot items, if present.${lootModifier}` +
            "  -> Topical items related to the lore but without an impact on the story, if present. These can range from very major to funny trinkets.\n" +
            "  -> Traps, if present. For example, the items above might be trapped.\n" +
            `  -> Topical (major) enemies in this room. Only use this for ${numRoomsEnemy} to ${numRoomsEnemy + 1} rooms. Ensure to give major enemies some weaker minions to spice up combat! ` +
            `PRECEDE each enemy with its CR (e.g. a CR X bandit). To determine the DC, ${combatModifier}.\n` +
            "  -> Information that the characters can learn here.\n\n" +
            "Again, make the rooms and their contents inspired, distinct, and unique. " +
            "Do not forget to base yourself on the history and current state of the location! " +
            `If you mentioned current inhabitants, ensure to include them in the rooms!${wackyModifier} ` +
            `Number the room entries from 1 to ${options.numRooms}, and place three dashes after each: ---.` +
            `${options.numRooms > 3 ? ` Give the first 3 out of the ${options.numRooms} rooms.` : ''}`
            :
            `Now give rooms ${(roomBatch - 1) * 3 + 1} through ${Math.min(options.numRooms, (roomBatch - 1) * 3 + 3)} out of ${options.numRooms}.`
    let { text: rt } = await fancyAsker.ask(THREAD_LORE, messageRooms)
    roomsText += '---' + rt
}

const rooms = roomsText.split('---').map(room => room.trim()).filter(room => room)
if (rooms.length != options.numRooms) {
    console.log(rooms.length, options.numRooms)
    console.log(roomsText)
    assert(false)
}

const messageRoomNames =
    `${roomsText}\n\n----------\n\nExtract the names of the ${options.numRooms} rooms. I want a list of ${options.numRooms} items, each on their own line, ` +
    "in the following format: Room X: Room name. Do not give me any other text!"
const { text: roomNamesText } = await asker.ask(getTempThread(), messageRoomNames)
const roomNames = roomNamesText.split('\n').slice(-options.numRooms).map(t => t.split(':')[1].trim())
const roomNamesString = roomNames.map((name, i) => `${name} (Room ${i + 1})`).join(', ')

const messageConnections =
    "What should be the layout of these rooms? The layout must serve two goals: " +
    "it should provide an exciting adventure with well-paced action and excitement building, " +
    "but it should not feel railroaded. Please suggest how the 8 rooms mentioned earlier could be connected. " +
    "Where possible, give the characters the freedom to choose multiple paths, " +
    "although you should not sacrifice the story for that. Be concise in your answer and do not repeat the room descriptions. " +
    "Feel free to make the layout either quite traditional or more unorthodox. " +
    "When there is something noteworthy about a connection, mention this as well. " +
    "USE SECRET PASSAGES ONLY VERY RARELY! When you do use something secret, " +
    "detail exactly how it is hidden and how it can be discovered. " +
    "At the end, fix any mistakes or inconsistencies you might spot."
const { text: connectionsDescription } = await fancyAsker.ask(THREAD_LORE, messageConnections)

const connectionsThread = getTempThread()
const messageConnectionsMarks =
    `${connectionsDescription}\n\n----------\n\nWe are designing a D&D dungeon with ${options.numRooms} rooms: ${roomNamesString}.\n\n` +
    "Repeat the description of the room connections above VERBATIM. " +
    "Anytime a connection between two rooms is introduced, mark it with [Connection: X-Y] where X and Y are ROOM NUMBERS. " +
    "Start a new mark for each connection (that is, do not combine different connections into the same mark!). " +
    `Only use this mark with the ${options.numRooms} rooms described above and MAKE SURE ALL CONNECTIONS ARE MARKED!`
const { text: marksText } = await asker.ask(connectionsThread, messageConnectionsMarks)

const messageConnectionsMarksCheck =
    "Repeat your answer, but this time, pay extra close attention that you mark all the connections that the text describes! " +
    "Every path, connection, door, route, secret exit... must be marked!"
const { text: marksTextChecked } = await asker.ask(connectionsThread, messageConnectionsMarksCheck)
asker.rollback(connectionsThread)

const connections = [...(marksText + marksTextChecked).matchAll(/\[Connections?:\s?(,?\s?\d+\s?-+\s?\d+)+\s?]/gi)].flatMap(
    match => [...match[0].matchAll(/(\d+)\s?-+\s?(\d+)/g)].map(range => [range[1], range[2]])
)
graph.makeUndirectedGraph([...Array(options.numRooms).keys()].map(i => i + 1), connections, `graph-${options.outputName}`)

const connectionTexts: string[] = []
for (let roomNumber = 1; roomNumber <= options.numRooms; ++roomNumber) {
    const messageRoomConnections =
        `Now, for ${roomNames[roomNumber - 1]} (Room ${roomNumber}), give a list of bullet points, each describing a connection EITHER FROM OR TO Room ${roomNumber}. ` +
        "Include all details you have on the connection, such as the type of connection, locations, potential requirements... DO NOT USE THE [Connection] notation anymore!"
    const { text: roomConnections } = await asker.ask(connectionsThread, messageRoomConnections)
    asker.rollback(connectionsThread)
    connectionTexts.push(onlyBullets(roomConnections))
}

const messageInterRooms =
    "We will now add a number of \"inter-room elements\". These are story elements that pertain to 2 or 3 rooms. " +
    "Examples are a lock in room A whose key is in room B, information from room X being required to defeat an enemy in room Y... " +
    "Everything that pertains to 2 or 3 rooms counts.\n\n" +
    "Inter-room elements can either relate to the descriptions above " +
    "(for example, by identifying a prerequisite to use an item or evade a trap mentioned there), or they can be entirely new.\n\n" +
    "For each inter-room element, mention the following.\n" +
    "- A summary of the inter-room element. Mention precisely what the element entails and give context. " +
        "Make all the requirements and exact mechanics crystal clear! Include precise instructions, text and quotes! Be detailed!\n" +
    "- A precise description of the effects and results when the players figure out the element (these should ONLY BE LOOT OR OPTIONAL EXTRAS, not vital story progression!)\n" +
    "- If present, mention **Physical prerequisites** (such as a key or an object)\n" +
    "  -> Mention the prerequisite and DETAIL EXACTLY where it can be found (only consider the room itself, or lower-numbered rooms!).\n" +
    "- Mention **Information/knowledge prerequisites** (such as knowing the solution to a puzzle, or knowing weaknesses of an enemy).\n" +
    "  -> List 3 DIFFERENT ways in which the information could be obtained. Be very SPECIFIC: " +
        "mention exactly how the information could be obtained and in which rooms this is" +
        "(only consider the room itself, or lower-numbered rooms!)! Go into a lot of detail! " +
        "Again, LIST THREE DIFFERENT WAYS! Make them very clear and straightforward!\n" +
    "- Mention **Meta-prerequisites** (ways that the characters can know **how** to solve a problem; " +
    "e.g. knowing that a previous object can help, or knowing that the solution to a puzzle is to say a specific phrase...)\n" +
    "  -> As above, give 3 DETAILED ways in which the characters can find this out.\n\n" +
    "I do NOT just want vague clues and cryptic hints. The characters will need clear information to proceed. " +
    "Information can be creative and hidden, but I DO NOT WANT MANY RIDDLES OR PUZZLES, and I DO NOT WANT MUSIC-RELATED THEMES. " +
    "I DO NOT WANT MAPS! Do not make the elements too elaborate! Focus on PHYSICAL ITEMS instead of vague codes or passwords.\n\n" +
    "Ensure that the information is reachable for the characters before they need it; that is, " +
    "DO NOT GIVE INFORMATION ONLY AFTER IT IS NEEDED! Put prerequisites in rooms with a lower number than the one they're needed in. " +
    "DO NOT ADD NEW ROOM CONNECTIONS! When giving information, always BE VERY PRECISE and INCLUDE DIRECT QUOTES AND EXCERPTS IF POSSIBLE. " +
    "Ensure each inter-room element only relates to 2 (or 3 if you must) rooms! Give 2 unique and distinct inter-room elements. " +
    "Separate the inter-room elements with three dashes: ---."
const { text: interRooms1 } = await fancyAsker.ask(THREAD_LORE, messageInterRooms)

const messageInterRoomsSmall =
    "Now suggest 2 new inter-room elements with a smaller scope. You can add new information to the rooms while doing this. " +
    "Again, ENSURE THAT THE NEEDED INFORMATION IS AVAILABLE BEFORE IT IS NEEDED (THAT IS, IN A LOWER-NUMBERED ROOM)! " +
    "These smaller-scope elements should be fun and interesting ways to link the rooms. " +
    "They could be small easter eggs, or objects from some room that turn out to be useful to find some loot in another room. " +
    `Do not include riddles or puzzles!${wackyModifier} Again, the elements should only relate to 2 rooms each. Separate the inter-room elements with three dashes: ---.`
const { text: interRooms2 } = await fancyAsker.ask(THREAD_LORE, messageInterRoomsSmall)
fancyAsker.rollback(THREAD_LORE)

const messageInterRoomsGlobal =
    "Now suggest 1 slightly different inter-room element. I want this one to be sort of \"global\" among the entire dungeon; " +
    "to not be a part of the rooms, but still to apply to them. This could, for example, " +
    "be a hidden network of shafts to move through, an environmental mechanic, " +
    "a timer that triggers something if the characters wait too long... Truly anything qualifies. " +
    "Be sure to incorporate the effect of this inter-room element on all the separate rooms. " +
    "Ensure the mechanics are completely fleshed out! Make the element unique, varied, and impactful."
const { text: interRooms3 } = await fancyAsker.ask(THREAD_LORE, messageInterRoomsGlobal)
fancyAsker.rollback(THREAD_LORE)

const interRoomTexts: string[] = []; for (let i = 1; i <= options.numRooms; ++i) interRoomTexts.push("")
const interRooms = (interRooms1 + '---' + interRooms2 + '---' + interRooms3).split('---').map(ir => ir.trim()).filter(s => s.length != 0)
for (let interRoom of interRooms) {
    const t = getTempThread()
    const messageRelevantRooms =
        `${interRoom}\n\n----------\n\nWe're designing a D&D dungeon with ${options.numRooms} rooms: ${roomNamesString}\n\n` +
        "Which of those rooms are relevant for this inter-room element? Give the numbers of those rooms."
    await asker.ask(t, messageRelevantRooms)
    const messageRelevantRoomsList =
        "Give me the relevant rooms again, but JUST THEIR NUMBERS, COMMA-SEPARATED. NOTHING ELSE."
    const { text: relevantRoomsText } = await asker.ask(t, messageRelevantRoomsList)
    const relevantRoomNumbers = relevantRoomsText.split(',').map(s => Number(s.trim())).sort()

    asker.rollback(t)
    const messageInterRoomSummary =
        "Give a ONE-SENTENCE summary of the inter-room element. Describe the main plot and the locations " +
        "where the main requirements can be found, but do not include the hints and clues scattered around. " +
        "DO NOT USE THE WORDS \"inter-room element\" OR \"prerequisite\" IN YOUR REPLY. State your summary factually " +
        "(\"There is...\") and don't make it seem like a big quest. For everything you mention, " +
        "mention both the name and the number of the room it's in!"
    const { text: irSummary } = await asker.ask(t, messageInterRoomSummary)
    asker.rollback(t)

    for (let roomNumber of relevantRoomNumbers) {
        let summary
        if (roomNumber === relevantRoomNumbers[0] && interRoom === interRooms[interRooms.length - 1]) {
            const messageInterRoomDetails =
                "Give a detailed mechanical explanation of the inter-room element, in CONCISE BULLET POINTS. " +
                "INCLUDE ALL THE MECHANICS. DO NOT GIVE AN OVERVIEW FOR INDIVIDUAL ROOMS!\n\n" +
                "For everything you mention, mention both the name and the number of the room it's in! However, " +
                "not a single bullet should be dedicated to just a single room. Instead, you should have one (1!) " +
                "bullet that gives a high-level summary of the kinds of effects the inter-room element can have in the rooms.\n\n" +
                "DO NOT USE THE WORDS \"inter-room element\" OR \"prerequisite\" IN YOUR REPLY."
            const { text: detailedSummary } = await asker.ask(t, messageInterRoomDetails)
            asker.rollback(t)
            summary = detailedSummary
        } else {
            summary = irSummary
        }

        const messageInterRoomRoom =
            `List only the information relevant to Room ${roomNumber} (${roomNames[roomNumber - 1]}). In each bullet point, ` +
            `be very clear to what extent the responsibility of Room ${roomNumber}'s designer goes! For instance, ` +
            "when mentioning an object not found in this room, state VERY CLEARLY that it is found somewhere else, and where. " +
            "Combine talking about this responsibility into the bullets themselves where possible.\n\n" +
            "Don't make anything up! Only list what a designer of the room should know ABOUT THIS PARTICULAR INTER-ROOM ELEMENT. " +
            "When mentioning something located in another room, always mention the room number to make it clear it's not talking " +
            "about this room! When the description contains literal quotes, clues or pieces of text, copy those VERBATIM! " +
            "Do not use the words \"inter-room element\" or \"prerequisite\" in your answer! " +
            "When mentioning any other room, include both the name AND THE NUMBER!"
        await asker.ask(t, messageInterRoomRoom)

        const messageInterRoomCompress =
            "Compress the above bullet points by removing redundant words. Ensure to keep every piece of information! " +
            "I'd rather the text contains a few too many words than that information is lost. " +
            "Keep names of objects, creatures, rooms... intact! When mentioning a room with a number, always keep both. " +
            "Keep mentioning who is responsible! Keep all details, especially literal quotes and passages! " +
            "Do not remove any objects, creatures or clues! Keep the bullet points and their order intact!"
        const { text: interRoomRoomText } = await asker.ask(t, messageInterRoomCompress)
        interRoomTexts[roomNumber - 1] += "- " + summary + "\n" + onlyBullets(interRoomRoomText) + "\n"

        asker.rollback(t)
        asker.rollback(t)
    }
}

const messageRoomsCheck =
    "Think long and hard: are there any plot holes or pieces of information the characters can't reasonably be expected to find? " +
    "If so, list it here and propose solutions that require the least amount of alterations to the rooms above."
await fancyAsker.ask(THREAD_LORE, messageRoomsCheck)

const roomSummariesList: string[] = []
for (let roomNumber = 1; roomNumber <= options.numRooms; ++roomNumber) {
    const messageRoomSummary =
        `Recall Room ${roomNumber}. ${rooms[roomNumber - 1]}\n\n----------\n\n` +
        `Now, for Room ${roomNumber}, compile a summary of everything a designer of that room would need to know. ` +
        "Don't forget your corrections from above! This includes everything you just told me, specifically any items or information that should be provided. " +
        "Be very detailed here! All details of the items and information should be provided, " +
        "including EXACT TEXT SNIPPETS IF THE OBJECT IS A PIECE OF TEXT. " +
        "ANSWER WITH AN UNSTRUCTURED LIST OF BULLET POINTS. DO NOT SUBDIVIDE THE LIST AND DO NOT USE TITLES. " +
        "Be detailed! Ensure to include all elements you generated above!\n\n" +
        "- Start with all the bullets connected to the room description above. When mentioning an item or creature important to the story, " +
            "describe it in detail! Also give their important properties! " +
            "Include the corrections and clarifications from above here, with all their details! End with three dashes: ---.\n" +
        "- Now add to this room more details that are not necessarily connected to the broader story. " +
            `Add descriptions, cool decor elements, potentially loot${lootModifier ? ` (${lootModifier})` : ''} and enemies (for enemies, ` +
            `mention the CR between parentheses and ${combatModifier})... DO NOT INTRODUCE MAPS. ` +
            "If possible, connect gameplay implications to some of the things you introduce. " +
            "This is the moment to get really creative, and make the room feel like a cool, real place! " +
            `You can add really cool items!${wackyModifier} Again, answer in unstructured bullet points.\n\n` +
        "Don't mention the specific information you elaborated when designing the inter-room elements. " +
        "When talking about clues, texts, or quotes, ensure to give the entire one verbatim! " +
        "Keep in mind that each room's text will go to a different designer! " +
        "Thus, if an object has relevance to another room, this should be specified very explicitly. Remember to be detailed!"
    const { text: roomSummary } = await fancyAsker.ask(THREAD_LORE, messageRoomSummary)
    fancyAsker.rollback(THREAD_LORE)
    roomSummariesList.push(
        roomSummary.split('---')
                   .map(s => s.trim())
                   .join('\n')
                   .replace(/inter-room /ig, '')
        + "\n" + connectionTexts[roomNumber - 1] + "\n" + interRoomTexts[roomNumber - 1]
    )
}

const titleMessage =
    options.wackiness == 'low' ?
        'A title for the dungeon module.' :
        options.wackiness == 'medium' ?
            'A unique and creative title for the dungeon module.' :
            'A creative and unique title for the dungeon module. You can make it a bit funny or wacky.'
const messageTexts =
    "I need four more pieces of text.\n" +
    `- ${titleMessage}\n` +
    "- An introduction to the dungeon module for the DM. Make this a nicely readable and relatively short " +
        "text that conveys the main challenges and draws of the module. Do not try to sell the dungeon; " +
        "simply summarize what happens. Do not address the DM directly.\n" +
    "- A description to read to the characters when they arrive at the outside of the dungeon. " +
        "What does the location look like from outside? What do the surroundings look like? " +
        "How do they get into Room 1? Do not make this a challenge gameplay-wise; this is purely for flavor.\n" +
    "- A text that tells the DM about what happens when the characters complete their mission. " +
        "What are the consequences? What happens to the location? What can they use the objects they found for?\n\n" +
    "Answer with these four pieces of text, AND NOTHING ELSE. No accompanying introduction or conclusion. " +
    "Separate the four pieces of text with three dashes: ---."
const { text: texts } = await fancyAsker.ask(THREAD_LORE, messageTexts)
const textsList = texts.split('---').map(text => text.trim())
const title = textsList[0].replaceAll(/["'.*]/g, ''), intro = textsList[1], outsideDescription = '*' + textsList[2] + '*', conclusion = textsList[3]

async function clarify(asker, thread, text, it) {
    const messageUnclear =
        `${text}\n\n----------\n\n` +
        "The above section is meant to feature in a D&D module, and the DM uses the text to run the module. " +
        "However, the text is not yet specific enough, often giving examples instead of citing what exactly the characters encounter. " +
        "Identify all the elements that are not yet specific enough for a DM to properly run the adventure. " +
        "Pay special attention to whether the characters have all the information and clues needed to progress. " +
        "Also make sure everything is named, and described effects are specified on a mechanical level. " +
        "DO NOT PROPOSE TO ADD NEW ELEMENTS! ONLY ELABORATE ON EXISTING ELEMENTS. BE CONCISE. " +
        `Give a list of THE 8 MOST IMPORTANT UNCLEAR ELEMENTS YOU CAN FIND.`
    await asker.ask(thread, messageUnclear)
    const messageUnclearFilter =
        "Repeat the unclear elements, but leave out those relating to the overarching story or to interaction between the rooms," +
        " instead of to this specific room in the dungeon."
    await asker.ask(thread, messageUnclearFilter)

    const messageClarify =
        "Please fill in the specifics of the points left unclear. Do not introduce new content or NPCs by doing this, " +
        "but just ensure the story is concrete and logical. Add a lot of details. " +
        "Make sure it is abundantly clear how the characters should acquire any potential clues! " +
        "When mentioning text, riddles, clues..., GIVE THE PRECISE TEXT VERBATIM THAT THE CHARACTERS ENCOUNTER. " +
        "DO NOT MAKE UP ANY INFORMATION ABOUT OTHER ROOMS IN THE DUNGEON, INCLUDING ANY EFFECTS OBJECTS IN " +
        "THIS ROOM MIGHT HAVE THERE. Do not introduce new objects that don't have a purpose, such as new keys or maps. " +
        "When you have to make up rewards, keep it simple and give an object or coins. " +
        "Do not provide examples of anything, but choose a specific suggestion. " +
        "Answer with just an unstructured bullet list, nothing else. I repeat, DO NOT MENTION OTHER ROOMS."
    await asker.ask(thread, messageClarify)

    const messageClarifyCorrect =
        "Did you make anything up about other rooms in the dungeon? Repeat your filled-in specific suggestions " +
        "from your last answer VERBATIM, but LEAVE OUT ANYTHING YOU MADE UP ABOUT OTHER ROOMS."
    await asker.ask(thread, messageClarifyCorrect)

    const messageClarifyConcise =
        "Repeat your answer from above, but compress the text by removing redundant words. " +
        "Ensure to keep every piece of information! I'd rather the text contains a few too many words than that information is lost. " +
        "Keep names of objects, creatures, rooms... intact! When mentioning a room with a number, always keep both. " +
        "Keep all details! Do not remove any objects, creatures or clues! Answer in unstructured bullet points."
    const { text: c } = await asker.ask(thread, messageClarifyConcise)

    return c
}

async function detailElement(asker, thread, text, _it) {
    const messageDetailedElement =
        `${text}\n\nThe above section is meant to feature in a D&D module, and the DM uses the text to run the module. ` +
        "However, the text is not yet specific enough, often giving examples instead of citing what exactly the characters encounter. " +
        "Please identify one single element of the room to go into a lot of detail about. The element might seem minor at first, " +
        "but by adding depth to it, we want to provide the players with a cool and unexpected experience.\n\n" +
        "State 3 suggested elements. Do not yet propose your additions, but explain why they " +
        "would be good candidates for this purpose. Be creative! Be concise in your response. " +
        "I'm not necessarily looking to suddenly make a small item very powerful, for example; " +
        "it's more a question of providing either mechanics or a lot of details " +
        "(the precise contents of a book, personal effects, a detailed list of stuff...) about something, " +
        "making the room feel like an alive place with a real background behind it. PICK AN ELEMENT THAT IS " +
        "MINOR IN THE DESCRIPTION ABOVE AND THAT DOES NOT LINK TO ANY BROADER STORY ELEMENTS OR TO OTHER ROOMS! " +
        "DO NOT PICK ITEMS RELEVANT TO THE STORY!"
    await asker.ask(thread, messageDetailedElement)

    const messageDetailedElementsDetails =
        "Choose the best out of the three elements.\n\n" +
        "Then, describe (concisely, but specifically) the additions you propose to make. Be as specific as possible, " +
        "add D&D mechanical effects where appropriate (but don't add any if they would be ridiculous) and add depth all-round. " +
        "Do not make it too roleplay-ey and do not add vague, non-specific descriptions. Be concrete and grounded. " +
        "Make your additions significant and ensure the characters get something out of interacting with it! " +
        "Do not make it too far-fetched! Do not add riddles, secret phrases, puzzles... Do not add anything " +
        "(such as keys) purportedly \"for later use\" in the dungeon! Keep it self-contained! " +
        "Giving lists of a set of similar things (names, techniques, items...) is always cool and a good way to " +
        "flesh something out, but don't feel like you have to. DO NOT TRY TO WEAVE THIS ELEMENT INTO THE STORY; " +
        "simply treat it as a free-standing element in the room."
    await asker.ask(thread, messageDetailedElementsDetails)

    const messageDetailedElementBullets =
        "Reformat your answer above into unstructured bullet points that together capture your additions."
    const { text: c } = await asker.ask(thread, messageDetailedElementBullets)

    return c
}

async function locations(asker, thread, text, _it) {
    const messageLocations =
        `${text}\n\nThe above text is meant to feature in a D&D module, and the DM uses the text to run the module. ` +
        "However, many elements within the room have not yet been given an exact location. " +
        "Propose locations for the most important elements in the room: decor elements, items the characters can find, enemies... " +
        "Answer in a concise bullet list. BE CONCISE! Each bullet point should concisely detail the location " +
        "in the room of a single item, creature, element... Ensure your locations are consistent. " +
        "Only add locations that aren't yet mentioned above. Add 8 locations."
    const { text: c } = await asker.ask(thread, messageLocations)
    return c
}

const clarifications = [
    clarify,
    clarify,
    detailElement,
    locations,
    clarify,
]

const finalMessages: string[] = []
const finalLambdas: Function[] = []

const roomTexts: string[] = []
let allCreatures: string[] = []
let allItems: string[] = []
for (let roomNumber = 1; roomNumber <= options.numRooms; ++roomNumber) {
    let text = roomSummariesList[roomNumber - 1]
    for (let clarificationIteration = 1; clarificationIteration <= clarifications.length; ++clarificationIteration) {
        const clarificationThread = `room${roomNumber}_c_it_${clarificationIteration}`
        const c = await clarifications[clarificationIteration - 1](asker, clarificationThread, text, clarificationIteration)
        text += '\n' + onlyBullets(c).replace(/^\d+[.:]/gm, '-')

        if (clarificationIteration >= 2 && text.length > 8_000) break
    }

    const extractionThreadCreatures = `room${roomNumber}_extract_c`

    let extractionTextCreatures = ''
    while (true) {
        const messageExtractCreatures =
            `${text}\n\n----------\n\n` +
            'From this text, extract all creatures and enemies that are mentioned, that occur in this room, ' +
            'and that the characters could possibly end up fighting against.\n' +
            'Answer in a single line, containing a concise comma-separated list. ' +
            'Only include names, no details. If nothing matches the given category, put "None" instead.'
        let { text: etc } = await asker.ask(extractionThreadCreatures, messageExtractCreatures)

        if ((etc.includes('None') || etc.includes('none')) && etc.includes(',')) {
            asker.rollback(extractionThreadCreatures)
        } else {
            extractionTextCreatures = etc
            break
        }
    }

    let creatures: string[] = []
    let filteredCreatures: string[] = []
    if (extractionTextCreatures.includes('None') || extractionTextCreatures.includes('none')) {
        creatures = []
        filteredCreatures = []
    } else {
        creatures = extractionTextCreatures.split(',').map(s => s.replace(/\(?CR\s*\d+(\/\d+)?\s*\)?/gi, '').trim())
        filteredCreatures = creatures.filter(creature => !allCreatures.map(s => s.toLowerCase().replace(/s/g, '')).includes(creature.toLowerCase().replace(/s/g, '')))
        allCreatures = allCreatures.concat(filteredCreatures)
    }

    let extractedCreatures = ''
    for (let creature of filteredCreatures) {
        const messageExtractedCreatures =
            `For the ${creature} above, provide a STANDARD D&D module entry in Markdown (Brewdown) style. ` +
            "Use ## for the title (which should probably be singular, unless the creature is a swarm). " +
            "Give a stat block (be concise! Avoid giving information that is unlikely to be needed. Don't include a description!). " +
            "The party is level 3; the combination of creatures in this room (pay attention to their amounts!) " +
            "should be very challenging, but of course not completely deadly to a level-3 party. " +
            "GENERATE STATS AND CHALLENGE RATINGS THAT REFLECT THIS (and potentially generate cool abilities to offset low stats). " +
            "REPLY ONLY WITH THE ENTRY! NO OTHER TEXT!"
        await asker.ask(extractionThreadCreatures, messageExtractedCreatures)

        const messageCreatureImprovements =
            "Do you see any major flaws to this creature? Think both mechanically and in terms of the module text. " +
            "Keep the creature's CR, and ensure its power level corresponds to that CR. " +
            "Just list potential improvements, don't give me an updated version yet. Be very specific! " +
            "Suggest specific and concrete improvements, no vague generalities such as \"Consider adding more abilities\"."
        await asker.ask(extractionThreadCreatures, messageCreatureImprovements)

        const messageCreatureUpdated =
            "Update the creature's stat block, adding in these improvements. " +
            "Ensure element of the stat block is in the correct place, and information is not repeated. " +
            "Do not add notes talking about how you updated the stat block! Do not add any notes to the stat block, " +
            "do not add DM tips, do not add a message saying the design can still be adapted by the DM. No notes!"
        const { text: ec } = await asker.ask(extractionThreadCreatures, messageCreatureUpdated)
        asker.rollback(extractionThreadCreatures)
        asker.rollback(extractionThreadCreatures)
        extractedCreatures += "\n\n{{monster,frame\n" + ec + "\n}}"
    }


    const extractionThreadItems = `room${roomNumber}_extract_i`

    let extractionTextItems = ''
    while (true) {
        const messageExtractItems =
            `${text}\n\n----------\n\n` +
            'From this text, extract all items, weapons and harvestables that would benefit from a separate entry ' +
            '(e.g. due to a magic effect or some other unusual quality). Normal coins or chests should not be mentioned.\n\n' +
            'Answer in a single line, containing a concise comma-separated list. ' +
            'Only include names, no details. If nothing matches the given category, put "None" instead.'
        let { text: eti } = await asker.ask(extractionThreadItems, messageExtractItems)

        if ((eti.includes('None') || eti.includes('none')) && eti.includes(',')) {
            asker.rollback(extractionThreadItems)
        } else {
            extractionTextItems = eti
            break
        }
    }

    let items: string[] = []
    let filteredItems: string[] = []
    if (extractionTextItems.includes('None') || extractionTextItems.includes('none')) {
        items = []
        filteredItems = []
    } else {
        items = extractionTextItems.split(',').map(s => s.trim())
        filteredItems = items.filter(item => !(allItems.concat(allCreatures)).map(s => s.toLowerCase().replace(/s/g, '')).includes(item.toLowerCase().replace(/s/g, '')))
        allItems = allItems.concat(filteredItems)
    }

    let extractedItems = ''
    for (let item of filteredItems) {
        const messageExtractedItems =
            `For the ${item}, provide a STANDARD D&D module entry in Markdown (Brewdown) style, ` +
            "using #### for the title (which should probably be singular). " +
            "First list the weight and value; then describe the properties in a single, concise text (no bullet points!). " +
            "Be concise yet specific and include PRECISE D&D MECHANICS WHEREVER POSSIBLE! " +
            `If the object is minor within the scope of the room, do not give it too many properties.${lootModifier} ` +
            "REPLY ONLY WITH THE ENTRY! NO OTHER TEXT!"
        const { text: ei } = await asker.ask(extractionThreadItems, messageExtractedItems)
        extractedItems += "\n\n" + ei
    }

    const fullDescription = text.replace(/\(?CR\s*\d+(\/\d+)?\s*\)?/gi, '')

    const messageClarifiedRoomDescription =
        `We are designing a D&D dungeon. The room I would like to design in more detail is Room ${roomNumber} (${roomNames[roomNumber - 1]}):\n` +
        `${fullDescription}\n\n----------\n\n` +
        "The ideas above are very interesting, but the text is not yet suited for an entry in a D&D module. " +
        "Overhaul the text to be concise and informative, containing all the information needed for the DM to run the session, " +
        "AND NOTHING MORE. If the room contains enemies, do not describe them in any detail. WRITE IN THE STYLE OF A D&D MODULE!\n" +
        `- State the title: ## Room ${roomNumber}: room_name\n` +
        "- START WITH A DESCRIPTION FOR THE PLAYERS, *given in italics*, describing what they see, and the ambiance of the room. Use the second person: \"you\".\n" +
        "- THEN GIVE A FULL DESCRIPTION OF THE ROOM. Be complete and visual: describe the lay-out of the room and detail what is present. Do not use second person here; be descriptive instead! " +
            "Pay special attention to the locations and descriptions of general areas in the room. Be extensive! " +
            "Ensure a DM reading this section gets a good idea of what the room looks like on first sight!\n" +
        "- GIVE A LIST OF NOTABLE FEATURES. Name this section ### Notable Features. Note that this means decor elements and features of the room, not items. " +
            "This contains elements from the description that have mechanics implications. Be very brief about those elements that will already get their own section. " +
            "Be detailed and specific! The more information you include, the better. This is also the place to talk about " +
            "where objects and creatures can be found in the room. If there more than one of some item or creature, " +
            "list the amount! The names of objects and creatures, as well as any other loot such as coins, " +
            "must be printed **in bold**. Most things you want to describe here should also have been mentioned in the Description!\n\n" +
        `When mentioning ANY ITEMS (${items.map(i => `**${i}**`).join(', ')}) ` +
        `OR CREATURES (${creatures.map(c => `**${c}**`).join(', ')}), do not provide any explanation about them ` +
        "and do not mention stats, as that will be done somewhere else. Simply PRINT THE NAMES IN **BOLD**.\n\n" +
        "Note that this is meant for a DM; BE CONCISE, PRECISE, SPECIFIC AND COMPLETE in anything you say. " +
        "ONLY LIST SPECIFIC IN-GAME INFORMATION, NO GENERALITIES OR DM TIPS. List specifically what loot can be found, " +
        "what the precise solution to a puzzle is, how concepts translate to in-game mechanics... " +
        "Answer in the style of a Homebrewery Markdown (Brewdown) module. Remember to start with descriptions " +
        "for the players and for the DM, and then to include a Notable Features section! Ensure to make the " +
        "description detailed and visual! Limit the description to 1 or 2 paragraphs!"
    let { text: clarifiedRoomDescriptionText } = await asker.ask(getTempThread(), messageClarifiedRoomDescription)
    clarifiedRoomDescriptionText = clarifiedRoomDescriptionText.split(/(#*|\**) *Notable Features/i)[0]

    const messageClarifiedRoomFeatures =
        `We are designing a D&D dungeon. The room I would like to design in more detail is room ${roomNumber} (${roomNames[roomNumber - 1]}):\n` +
        `${fullDescription}\n\n----------\n\n` +
        "The ideas above are very interesting, but the text is not yet suited for an entry in a D&D module. " +
        "Overhaul the text to be concise and informative, containing all the information needed for the DM to run the session, " +
        "AND NOTHING MORE. If the room contains enemies, do not describe them in any detail. WRITE IN THE STYLE OF A D&D MODULE!\n" +
        `- State the title: ## Room ${roomNumber}: room_name\n` +
        "- Do not provide a description, as that will be done elsewhere. Instead, continue immediately to the notable features.\n" +
        "- GIVE A LIST OF NOTABLE FEATURES, using bullet points. Name this section ### Notable Features. Note that this means decor elements and features of the room, not items. " +
            "This contains elements from the description that have mechanics implications. Be very brief about those elements that will already get their own section. " +
            "Be detailed and specific! The more information you include, the better. This is also the place to talk about " +
            "where objects and creatures can be found in the room. If there more than one of some item or creature, " +
            "list the amount! The names of objects and creatures, as well as any other loot such as coins, must be printed **in bold**.\n" +
        "- Add OTHER SECTIONS if you think they are needed for specific mechanics or puzzles that merit their own section. " +
            "This is encouraged, but you should provide A LOT OF DETAILS, more than in the notable features list! " +
            "Ensure a DM has all the information they need. " +
            "Be very specific about D&D mechanical implications! DO NOT ADD SECTIONS FOR LOOT OR CREATURES.\n\n" +
            `When mentioning ANY ITEMS (${items.map(i => `**${i}**`).join(', ')}) ` +
            `OR CREATURES (${creatures.map(c => `**${c}**`).join(', ')}), do not provide any explanation about them, ` +
            "as that will be done somewhere else. Simply PRINT THE NAMES IN **BOLD**.\n\n" +
        "Note that this is meant for a DM; BE CONCISE, PRECISE, SPECIFIC AND COMPLETE in anything you say. " +
        "ONLY LIST SPECIFIC IN-GAME INFORMATION, NO GENERALITIES OR DM TIPS. List specifically what loot can be found, " +
        "what the precise solution to a puzzle is, how concepts translate to in-game mechanics... " +
        "Answer in the style of a Homebrewery Markdown (Brewdown) module. If any text was given verbatim, ensure to include it in the module! " +
        "Any clues given in the bullets above should be PRESERVED IN DETAIL. ENSURE ALL THE BULLET POINTS ABOVE ARE ADDRESSED. " +
        "Again, include all quotes, texts, and clues verbatim! Give as many details as you can!"
    finalMessages.push(messageClarifiedRoomFeatures)
    finalLambdas.push(clarifiedRoomFeaturesText => roomTexts.push(clarifiedRoomDescriptionText + '\n\n' + clarifiedRoomFeaturesText.trim().split('\n').slice(1).join('\n') + '\n\n' + extractedItems + '\n\n' + extractedCreatures))
// }
//
// for (let roomNumber = 1; roomNumber <= options.numRooms; ++roomNumber) {
    const thread = getTempThread()
    let { text: clarifiedRoomText } = await fancyAsker.ask(thread, finalMessages[roomNumber - 1])
    clarifiedRoomText = clarifiedRoomText.trim()
    if (!".!?\"'”“".includes(clarifiedRoomText[clarifiedRoomText.length - 1])) {
        const { text: addition } = await fancyAsker.ask(thread, "Continue")
        clarifiedRoomText += " " + addition.trim()
    }
    finalLambdas[roomNumber - 1](clarifiedRoomText)
}

const roomSections = roomTexts

const motivationSection =
    `## Motivation\nThere are many reasons why the PCs might embark on this quest. Some examples are given.\n\n${motivations}`

const arrivalSection =
    `## Arrival\n${outsideDescription}`

const conclusionSection =
    `## Conclusion\n${conclusion}`

const creditsSection =
    `{{descriptive\nThis module was generated using a script based on artificial intelligence, with the following parameters.\n:\n${Object.keys(options).filter(k => k !== 'outputName').map(k => `${k}: ${options[k]}`).join('\n:\n')}.\n}}`

const layoutSection =
    `## Dungeon layout\nThe dungeon's rooms are laid out as follows.\n\n![layout](TODO) {height:280px,mix-blend-mode:multiply}`

const sections = [
    motivationSection,
    arrivalSection,
    layoutSection,
    ...roomSections,
    conclusionSection,
    creditsSection,
]
const hbText = hb.getMD(title, intro, sections)
console.log(hbText)
fs.writeFileSync(options.outputName, hbText)

asker.finalize()
fancyAsker.finalize()
