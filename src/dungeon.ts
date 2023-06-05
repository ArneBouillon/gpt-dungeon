import * as graph from './graph.js'
import * as hb from './homebrewery.js'
import * as util from './util.js'

import assert from 'assert'
import * as fs from 'fs'

const asker = new util.ChatGPTAsker()

const alwaysPromptAsker = new util.PromptAsker()

const THREAD_MAIN = 'main'
const THREAD_LORE = 'lore'

function preprocessName(str) {
    return str.toLowerCase().replaceAll(/(the|a|an|\(.+\))/g, '').trim()
}

const messageKeywords =
    "Give me three randomly picked nouns or adjectives. Ensure the words are very concrete and not too abstract. " +
    "Also ensure none of the words include anything modern. Answer with a comma-separated list, and no other text."
// const { text: keywords } = await asker.ask(util.getTempThread(), messageKeywords)
const keywords = 'Ruin, Collector, Plants'

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

const messageLore =
    `${dungeon}\n${history}\n\n---------\n\n` +
    "Develop a full lore about this location. Focus primarily on the current state of the location, " +
    "its potential inhabitants, and the secrets hidden within. Be very information-dense! " +
    "Do not overcomplicate things and keep everything self-contained. " +
    "Ensure to include 1 secret that visiting adventurers could discover."
const { text: lore } = await alwaysPromptAsker.ask(THREAD_LORE, messageLore)

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
    "Don't propose too many. ANSWER ONLY WITH A NUMBERED LIST OF MOTIVATIONS; NO OTHER TEXT."
const { text: motivations } = await asker.ask(missionThread, messageMotivations)

const messageRooms =
    "The above location is used as a D&D dungeon. " +
    `The characters' mission is the following. ${mission}\n\n` +
    "Propose 6 rooms in which to divide the dungeon. They should culminate in an opportunity to complete the above mission. " +
    "For each room, discuss\n" +
    "- The general setting and atmosphere of the room.\n" +
    "- Anything present in the room that relates to the lore of the location and/or the story of the adventure. Be detailed and specific!\n" +
    "  -> Story-related items, if present.\n" +
    "  -> Major loot items, if present.\n" +
    "  -> Topical items related to the lore but without an impact on the story, if present. These can range from very major to funny trinkets.\n" +
    "  -> Traps, if present. For example, the items above might be trapped.\n" +
    "  -> Major enemies in this room. Only use this for 2 to 3 rooms.\n" +
    "  -> Information that the characters can learn here.\n" +
    "Separate the room entries with three dashes: ---."
const { text: roomsText } = await alwaysPromptAsker.ask(THREAD_LORE, messageRooms)
const rooms = roomsText.split('---').map(room => room.trim())
assert(rooms.length >= 6)

const messageInterRooms =
    "We will now add a number of \"inter-room elements\". These are story elements that pertain to multiple rooms. " +
    "Examples are a lock in room A whose key is in room B, information from room X being required to defeat an enemy " +
    "in room Y... Everything that pertains to multiple rooms counts.\n\n" +
    "Inter-room elements can either relate to the descriptions above (for example, " +
    "by identifying a prerequisite to use an item or evade a trap mentioned there), " +
    "or they can be entirely new. Each inter-room element can have any number of\n\n" +
    "Physical prerequisites (such as a key or an object)\n" +
    "  -> Mention the prerequisite and DETAIL EXACTLY where it can be found (only consider the room itself, or lower-numbered rooms!).\n\n" +
    "Information/knowledge prerequisites (such as knowing hints for solving a puzzle, or knowing weaknesses of an enemy)\n" +
    "  -> List 3 DIFFERENT ways in which the information could be obtained. Be very SPECIFIC: " +
        "mention exactly how the information could be obtained and in which rooms this is (only consider the room itself, " +
        "or lower-numbered rooms!)! Go into a lot of detail! Again, LIST THREE DIFFERENT WAYS! " +
        "The clues can be creative, but should be fairly obvious and simple. Do not use riddles!\n\n" +
    "Meta-prerequisites (ways that the characters can know **how** to solve a problem; e.g. " +
    "knowing that a previous object can help, or knowing that the solution to a puzzle is to say a specific phrase...)\n" +
    "  -> As above, give 3 DETAILED ways in which the characters can find this out.\n\n" +
    "Suggest multiple large-scope inter-room elements here. Start each entry with a description, and then go over to the prerequisites."
await alwaysPromptAsker.ask(THREAD_LORE, messageInterRooms)

const messageInterRoomsSmall =
    "Now suggest some new inter-room elements with a smaller scope. You can add new information to the rooms while doing this. " +
    "These smaller-scope elements should be fun and interesting ways to link the rooms. " +
    "They could be small easter eggs, or objects from some room that turn out to be useful to find some loot in another room."
await alwaysPromptAsker.ask(THREAD_LORE, messageInterRoomsSmall)

const messageRoomsCheck =
    "Think long and hard: are there any plot holes or pieces of information the characters can't reasonably be expected to find? " +
    "If so, list it here and propose solutions that require the least amount of alterations to the rooms above."
await alwaysPromptAsker.ask(THREAD_LORE, messageRoomsCheck)

const roomSummariesList: string[] = []
for (let roomNumber = 6; roomNumber >= 1; --roomNumber) {
    const messageRoomSummary =
        `Recall ${rooms[roomNumber - 1]}\n\n----------\n\n` +
        `Now, for Room ${roomNumber}, compile a summary of everything a designer of that room would need to know. ` +
        "Don't forget your corrections from above and don't forget the inter-room elements. " +
        "This includes everything you just told me, specifically any items or information that should be provided. " +
        "Be very detailed here! All details of the items and information should be provided, " +
        "including EXACT TEXT SNIPPETS IF THE OBJECT IS A PIECE OF TEXT. " +
        "ANSWER WITH AN UNSTRUCTURED LIST OF BULLET POINTS. DO NOT SUBDIVIDE THE LIST AND DO NOT USE TITLES. " +
        "Be detailed! Ensure to include all elements you generated above!\n\n" +
        "- Start with all the bullets connected to the room description above. End with three dashes: ---.\n" +
        "- Then give all the bullets connected to the inter-room elements and to the proposed solution of the previous message. " +
            "Be detailed! For the inter-room elements, only include the information related to this specific room, " +
            "but mention explicitly and verbatim that all other parts of the element are dealt with in another room. " +
            "Since the designers of the other room won't have the necessary context, INCLUDE A LARGE AMOUNT OF DETAILS. " +
            "End with three dashes: ---.\n" +
        "- Now add to this room more details that are not necessarily connected to the broader story. " +
            "Add descriptions, cool decor elements, potentially medium to minor loot and medium to minor enemies... " +
            "If possible, connect (medium to minor) gameplay implications to some of the things you introduce. " +
            "Again, answer in unstructured bullet points.\n\n" +
        "Keep in mind that each room's text will go to a different designer! " +
        "Thus, if an object has relevance to another room, this should be specified very explicitly. Remember to be detailed!"
    const { text: roomSummary } = await alwaysPromptAsker.ask(THREAD_LORE, messageRoomSummary)
    roomSummariesList.push(roomSummary.split('---').map(s => s.trim()).join('\n'))
}
roomSummariesList.reverse()

const messageTexts =
    "I need three more pieces of text.\n" +
    "- An introduction to the dungeon module for the DM. Make this a nicely readable and relatively short " +
        "text that conveys the main challenges and draws of the module. Do not try to sell the dungeon; " +
        "simply summarize what happens. Do not address the DM directly.\n" +
    "- A description to read to the characters when they arrive at the outside of the dungeon. " +
        "What does the location look like from outside? What do the surroundings look like? " +
        "How do they get into Room 1? Do not make this a challenge gameplay-wise; this is purely for flavor.\n" +
    "- A text that tells the DM about what happens when the characters complete their mission. " +
        "What are the consequences? What happens to the location? What can they use the objects they found for?\n\n" +
    "Answer with these three pieces of text, AND NOTHING ELSE. No accompanying introduction or conclusion. " +
    "Separate the three pieces of text with three dashes: ---."
const { text: texts } = await alwaysPromptAsker.ask(THREAD_LORE, messageTexts)
const textsList = texts.split('---').map(text => text.trim())
const intro = textsList[0], outsideDescription = '*' + textsList[1] + '*', conclusion = textsList[2]

// const roomsList: string[] = rooms.split('\n').map((room) => room.match(/\s*\d\d?.?\s*(.*)\s*/)?.[1]).filter(room => room).map(room => room!)
// console.log(roomsList)
// assert(roomsList.length == 6)
//
// const rawRoomNames = roomsList.map(room => room.match(/^(.+?):/)?.[1])
// const roomNames = rawRoomNames.map(room => preprocessName(room))
// console.log(roomNames)
//
// const messageLayout =
//     "What should be the layout of these rooms? The layout must serve two goals: " +
//     "it should provide an exciting adventure with well-paced action and excitement building, " +
//     "but it should not feel railroaded. Please suggest how the 6 rooms mentioned earlier could be connected. " +
//     "Where possible, give the characters the freedom to choose multiple paths, although you should not sacrifice the story for that. " +
//     `Be concise in your answer and do not repeat the room descriptions. Instead, REFER TO THE ROOMS ABOVE (${rawRoomNames.join(', ')}) BY NAME. ` +
//     "ENSURE EVERYTHING MAKES LOGICAL SENSE AND THE CHARACTERS CAN EXPLORE THE ENTIRE DUNGEON WITHOUT GETTING STUCK! " +
//     "ONLY MENTION THE LAYOUT."
// const { text: layout } = await asker.ask(THREAD_MAIN2, messageLayout)
//
// const messageConnections =
//     "Repeat your full last message, but anytime you introduce a connection between two rooms, " +
//     `mark it with [Connection: Room 1 <-> Room 2]. Start a new mark for each connection. ` +
//     `Only use this mark with the 6 rooms you proposed above (${rawRoomNames.join(', ')}), ` +
//     "and MAKE SURE ALL CONNECTIONS ARE MARKED! ONLY ADD MARKS FOR THE 6 ROOMS!"
// const { text: connections } = await asker.ask(THREAD_MAIN2, messageConnections)
//
// const messageConnectionsMissed =
//     "Are there any marks you missed? Give them here. Again, give a SEPARATE mark for each connection! " +
//     `ONLY add marks for the rooms ${rawRoomNames.join(', ')}.` // TODO: It still sometimes misses some... It might help to state explicitly here that it should NOT repeat the rest of the text, as that might be linked.
// const { text: connectionsMissed } = await asker.ask(THREAD_MAIN2, messageConnectionsMissed)
//
// const numberConnections = [...(connections + connectionsMissed)
//     .matchAll(/\[[cC]onnection:\s?(.+?)\s?<?->\s?(.+?)\s?]/g)]
//     .filter(
//         match => match[1].toLowerCase() != "room 1"
//     ).map(
//         match => {
//             const numbers = [roomNames.indexOf(preprocessName(match[1])) + 1, roomNames.indexOf(preprocessName(match[2])) + 1]
//             console.log(preprocessName(match[1]))
//             console.log(preprocessName(match[2]))
//             // assert(numbers[0] >= 1 && numbers[1] >= 1)
//             return numbers
//         }
//     ).filter(
//         numbers => {
//             if (numbers[0] < 0 || numbers[1] < 0) {
//                 console.log("WARNING: Incorrect mark")
//                 return false
//             }
//
//             return true
//         }
//     )
// graph.makeUndirectedGraph([1, 2, 3, 4, 5, 6], numberConnections)

// const messageRoomSummaries =
//     `${roomsList.join('\n')}\n\nRecall these rooms. Now state for each room:\n` +
//     "- The overall amount of content in this room (low/medium/high). Ensure a good mix of this.\n" +
//     "- The types of content present in this room (loot/combat/social/...)\n" +
//     "- A bit more detail about the content. Keep it at the conceptual level; conciseness is important.\n\n" +
//     "Separate each room's text with three dashes: ---. Reply with ONLY THE 6 ROOMS. " +
//     "I'm looking for a dungeon light on puzzles, medium on combat and high on loot." // TODO: Temporary
// const { text: roomSummaries } = await asker.ask(THREAD_MAIN2, messageRoomSummaries)
// const roomSummariesList = roomSummaries.split('---').map(room => room.trim()).filter(room => room)
// console.log(roomSummariesList)
// assert(roomSummariesList.length >= 6) // TODO: Check that if it's more, it's just bc some note was put after it

const roomTexts: string[] = []
let allCreatures = ''
let allItems = ''
for (let roomNumber = 1; roomNumber <= 6; ++roomNumber) {
    let clarifications = ''
    for (let clarificationIteration = 1; clarificationIteration <= 2; ++clarificationIteration) {
        const thread = `room${roomNumber}_c_it_${clarificationIteration}`

        const messageRoomText =
            `We are designing a D&D dungeon. The context is as follows. ${context}\n\n----------\n\n` +
            `The room I would like to design in more detail is the following:\n${roomSummariesList[roomNumber - 1]}\n${clarifications}\n\n----------\n\n` +
            "The ideas above are very interesting, but the text is not yet suited for an entry in a D&D module. " +
            "Overhaul the text to be concise and informative, containing all the information needed for the DM to run the session, " +
            "AND NOTHING MORE. If the room contains enemies, do not describe them in any detail. WRITE IN THE STYLE OF A D&D MODULE!\n" +
            "- START WITH A DESCRIPTION FOR THE PLAYERS, *given entirely in italics*, describing what they see, and the ambiance of the room.\n" +
            "- THEN GIVE A FULL DESCRIPTION OF THE ROOM FOR THE DM. Be complete and visual: describe the lay-out of the room and detail what is present.\n" +
            "- GIVE A LIST OF NOTABLE FEATURES. This contains elements from the description that have mechanics implications. " +
            "Be very explicit yet concise about these mechanical implications! " +
            "This is also the place to talk about where objects and creatures can be found in the room. " +
            "Be very explicit yet concise about the location of everything! The names of objects and creatures, " +
            "as well as any other loot such as coins, must be printed **in bold**. Most things you want to describe here " +
            "should also have been mentioned in the Description!\n" +
            "- DO NOT ADD ANY OTHER SECTIONS. STOP THE TEXT IMMEDIATELY AFTER THE NOTABLE FEATURES.\n" +
            "\n" +
            "Note that this is meant for a DM; BE CONCISE, PRECISE, SPECIFIC AND COMPLETE in anything you say. " +
            "ONLY LIST SPECIFIC IN-GAME INFORMATION, NO GENERALITIES OR DM TIPS. List specifically what loot can be found, " +
            "what the precise solution to a puzzle is, how concepts translate to in-game mechanics... " +
            "Add no sections that I haven't described above. Answer in the style of a Homebrewery Markdown (Brewdown) module."
        const { text: roomText1 } = await asker.ask(thread, messageRoomText)

        const clarificationThread = `room${roomNumber}_c_c_it_${clarificationIteration}`

        const messageUnclear =
            `${roomText1}\n\n----------\n\n` +
            "The above section is meant to feature in a D&D module, and the DM uses the text to run the module. " +
            "However, the text is not yet specific enough, often giving examples instead of citing what exactly the characters encounter. " +
            "Identify all the elements that are not yet specific enough for a DM to properly run the adventure. " +
            "Pay special attention to whether the characters have all the information and clues needed to progress. " +
            "Also make sure everything is named, and described effects are specified on a mechanical level. " +
            "DO NOT PROPOSE TO ADD NEW ELEMENTS! ONLY ELABORATE ON EXISTING ELEMENTS. BE CONCISE. " +
            `Give a list of AS MANY UNCLEAR ELEMENTS AS YOU CAN FIND${clarificationIteration == 1 ? " (at least 10, and the more, the better!)" : ""}.`
        await asker.ask(clarificationThread, messageUnclear)
        const messageUnclearFilter =
            "Repeat the unclear elements, but leave out those relating to the overarching story instead of to this specific " +
            "room in the dungeon. Answer with just a numbered list, nothing else."
        await asker.ask(clarificationThread, messageUnclearFilter)

        const messageClarify =
            "Please fill in the specifics of the points left unclear. DO NOT INTRODUCE ADDITIONAL CONTENT OR NPCs by doing this, " +
            "but just ensure the story is concrete and logical. Make sure it is clear how the characters should acquire any potential clues. " +
            "DO NOT MAKE UP ANY INFORMATION ABOUT OTHER ROOMS IN THE DUNGEON, INCLUDING ANY EFFECTS OBJECTS IN THIS ROOM MIGHT HAVE THERE. " +
            "Answer with just an unstructured bullet list, nothing else. I repeat, DO NOT MENTION OTHER ROOMS."
        await asker.ask(clarificationThread, messageClarify)

        const messageClarifyCorrect =
            "Did you make anything up about other rooms in the dungeon? Repeat your answer from above verbatim, " +
            "but LEAVE OUT ANYTHING YOU MADE UP ABOUT OTHER ROOMS."
        const { text: c } = await asker.ask(clarificationThread, messageClarifyCorrect)
        clarifications += c + '\n'
    }

    const extractionThreadItems = `room${roomNumber}_extract_i`

    const messageExtractItems =
        `${roomSummariesList[roomNumber - 1]}\n${clarifications}\n\n----------\n\n` +
        'From this text, extract all items that would benefit from a separate entry (e.g. due to a magic effect or some other unusual quality). Normal coins or chests should not be mentioned.\n' +
        'Answer in a single line, containing a concise comma-separated list. ' +
        'Only include names, no details. If nothing matches the given category, put "None" instead.'
    let { text: extractionTextItems } = await asker.ask(extractionThreadItems, messageExtractItems)

    if (allItems.length != 0) {
        const messageFilterItems =
            `Now imagine there already are descriptions for the following items: ${allCreatures}. ` +
            "Repeat all items from your list above that still need a description. Only leave an item out " +
            "if it is exactly included in the list I'm giving you!"
        let { text: t } = await asker.ask(extractionThreadItems, messageFilterItems)
        extractionTextItems = t
    }
    allItems += extractionTextItems + ', '

    const items = extractionTextItems.includes('None') || extractionTextItems.includes('none') ? [] : extractionTextItems.split(',').map(s => s.trim())

    let extractedItems = ''
    for (let item of items) {
        const messageExtractedItems =
            `For the ${item}, provide a STANDARD D&D module entry in Markdown (Brewdown) style, ` +
            "using #### for the title (which should probably be singular). " +
            "First list the weight and value; then describe the properties in a single, concise text (no bullet points!). " +
            "Be concise yet specific and include PRECISE D&D MECHANICS WHEREVER POSSIBLE! " +
            "If the object is minor within the scope of the room, do not give it too many properties. " +
            "REPLY ONLY WITH THE ENTRY! NO OTHER TEXT!"
        const { text: ei } = await asker.ask(extractionThreadItems, messageExtractedItems)
        extractedItems += "\n\n" + ei
    }

    const extractionThreadCreatures = `room${roomNumber}_extract_c`

    const messageExtractCreatures =
        `${roomSummariesList[roomNumber - 1]}\n${clarifications}\n\n----------\n\n` +
        'From this text, extract all creatures that are mentioned.\n' +
        'Answer in a single line, containing a concise comma-separated list. ' +
        'Only include names, no details. If nothing matches the given category, put "None" instead.'
    let { text: extractionTextCreatures } = await asker.ask(extractionThreadCreatures, messageExtractCreatures)

    if (allCreatures.length != 0) {
        const messageFilterCreatures =
            `Now imagine there already are descriptions for the following creatures: ${allCreatures}. ` +
            "Repeat all creatures from your list above that still need a description. Only leave a creature out " +
            "if it is exactly included in the list I'm giving you!"
        let { text: t } = await asker.ask(extractionThreadCreatures, messageFilterCreatures)
        extractionTextCreatures = t
    }
    allCreatures += extractionTextCreatures + ', '

    const creatures = extractionTextCreatures.includes('None') || extractionTextCreatures.includes('none') ? [] : extractionTextCreatures.split(',').map(s => s.trim())

    let extractedCreatures = ''
    for (let creature of creatures) {
        const messageExtractedCreatures =
            `For the ${creature} above, provide a STANDARD D&D module entry in Markdown (Brewdown) style. ` +
            "Use ## for the title (which should probably be singular, unless the creature is a swarm). " +
            "Give a stat block (be concise! Avoid giving information that is unlikely to be needed. " +
            "Don't include a description!) and include a table of ability stats. " +
            "The party is level 3; the combination of creatures in this room (pay attention to their amounts!) " +
            "should be very challenging, but of course not completely deadly to a level-3 party. " +
            "GENERATE STATS AND CHALLENGE RATINGS THAT REFLECT THIS (and potentially generate cool abilities to offset low stats). " +
            "REPLY ONLY WITH THE ENTRY! NO OTHER TEXT!"
        const { text: ec } = await asker.ask(extractionThreadCreatures, messageExtractedCreatures)
        extractedCreatures += "\n\n{{monster,frame\n" + ec + "\n}}"
    }

    const locationThread = `room${roomNumber}_loc`

    const messageLocations =
        `${roomSummariesList[roomNumber - 1]}\n${clarifications}\n\n----------\n\n` +
        "The above text is meant to feature in a D&D module, and the DM uses the text to run the module. " +
        "However, many elements within the room have not yet been given an exact location. " +
        "Propose locations for the most important elements in the room: decor elements, " +
        "items the characters can find, enemies... Answer in a concise bullet list. BE CONCISE!"
    const { text: locationsText } = await asker.ask(locationThread, messageLocations)

    const finalThread = `room${roomNumber}_f`

    const messageClarifiedRoom =
        `We are designing a D&D dungeon. The room I would like to design in more detail is room ${roomNumber}:\n` +
        `${roomSummariesList[roomNumber - 1]}\n${clarifications}\n${locationsText}\n\n----------\n\n` +
        "The ideas above are very interesting, but the text is not yet suited for an entry in a D&D module. " +
        "Overhaul the text to be concise and informative, containing all the information needed for the DM to run the session, " +
        "AND NOTHING MORE. If the room contains enemies, do not describe them in any detail. WRITE IN THE STYLE OF A D&D MODULE!\n" +
        `- State the title: ## Room ${roomNumber}: room_name\n` +
        "- START WITH A DESCRIPTION FOR THE PLAYERS, *given in italics*, describing what they see, and the ambiance of the room.\n" +
        "- THEN GIVE A FULL DESCRIPTION OF THE ROOM. Be complete and visual: describe the lay-out of the room and detail what is present. " +
        "Pay special attention to the locations and descriptions of general areas in the room.\n" +
        "- GIVE A LIST OF NOTABLE FEATURES. Note that this means decor elements and features of the room, not items. " +
        "This contains elements from the description that have mechanics implications. Be very brief about those elements that will already get their own section. " +
        "Be detailed and specific! The more information you include, the better. This is also the place to talk about " +
        "where objects and creatures can be found in the room. If there more than one of some item or creature, " +
        "list the amount! The names of objects and creatures, as well as any other loot such as coins, " +
        "must be printed **in bold**. Most things you want to describe here should also have been mentioned in the Description!\n" +
        "- Add OTHER SECTIONS if you think they are needed for specific mechanics or puzzles that merit their own section. " +
        "This is encouraged, but you should provide A LOT OF DETAILS! Ensure a DM has all the information they need. " +
        "Be very specific about D&D mechanical implications! DO NOT ADD SECTIONS FOR LOOT OR CREATURES.\n\n" +
        `When mentioning ANY OF:\n${items.join(', ') + "; " + creatures.join(', ')}\n, do not provide any explanation about them, ` +
        "as that will be done somewhere else. Simply PRINT THE NAMES IN **BOLD**.\n" +
        "\n" +
        "Note that this is meant for a DM; BE CONCISE, PRECISE, SPECIFIC AND COMPLETE in anything you say. " +
        "ONLY LIST SPECIFIC IN-GAME INFORMATION, NO GENERALITIES OR DM TIPS. List specifically what loot can be found, " +
        "what the precise solution to a puzzle is, how concepts translate to in-game mechanics... " +
        "Answer in the style of a Homebrewery Markdown (Brewdown) module. ENSURE ALL THE BULLET POINTS ABOVE ARE ADDRESSED."
    const { text: clarifiedRoomText } = await alwaysPromptAsker.ask(finalThread, messageClarifiedRoom)

    roomTexts.push(clarifiedRoomText + '\n\n' + extractedItems + '\n\n' + extractedCreatures)
}

const titleText =
    "Propose a title for this adventure. STATE ONLY THE TITLE ITSELF, NO EXTRA TEXT."
const { text: rawTitle } = await asker.ask(THREAD_MAIN, titleText)
const title = rawTitle.replaceAll(/["'.]/g, '')

const roomSections = roomTexts

const motivationSection =
    `## Motivation\nThere are many reasons why the PCs might embark on this quest. Some examples are given.\n\n${motivations}`

const arrivalSection =
    `## Arrival\n${outsideDescription}`

const conclusionSection =
    `## Conclusion\n${conclusion}`

// const layoutSection =
//     `## Dungeon layout\nThe dungeon's rooms are laid out as follows.\n\n![layout](TODO) {height:280px,mix-blend-mode:multiply}`

const sections = [
    motivationSection,
    arrivalSection,
    // layoutSection,
    ...roomSections,
    conclusionSection,
]
const hbText = hb.getMD(title, intro, sections)
console.log(hbText)
fs.writeFileSync('output.txt', hbText)
