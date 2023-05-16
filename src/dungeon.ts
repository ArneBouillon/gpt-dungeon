import * as util from './util.js'
import assert from 'assert'

const asker = new util.PromptAsker()

const THREAD_KEYWORDS = 'kw'
const THREAD_MAIN = 'main'
const THREAD_MAIN2 = 'main2'

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
    "BE CREATIVE AND DON'T STICK TO CLICHES! ANSWER IN A SINGLE SENTENCE.  " +
    `Use the following keywords: ${keywords}`
const { text: dungeon } = await asker.ask(THREAD_MAIN, messageDungeon)

const messageMission =
    "That sounds awesome! Now we need to add some meat to the story. " +
    "On a high level, what will be the characters' mission? " +
    "Suggest a BRIEF, SELF-CONTAINED goal WITH A SMALL SCOPE that can be managed in a single session. " +
    "Do not yet mention their motivation for this goal. BE CREATIVE AND DON'T STICK TO CLICHES!"
const { text: mission } = await asker.ask(THREAD_MAIN, messageMission)

const messageMotivation =
    "That sounds good. Now suggest an interesting motivation for the characters to do this. " +
    "Ensure it can apply to any set of characters that might be playing!"
const { text: motivation } = await asker.ask(THREAD_MAIN, messageMotivation)

const messageChallenges =
    "Great. Now we should identify the main challenges in this dungeon. Select five main challenges that " +
    "the characters will have to contend with. Ensure a good mix that might include fights, puzzles, traps, " +
    "NPC interactions, dilemmas... Really let your imagination run wild! DON'T STICK TO CLICHES!"
const { text: challenges } = await asker.ask(THREAD_MAIN, messageChallenges)

const messageChallengesElaborated =
    "Now repeat the five main challenges you just gave me, but add the following. If the challenge is a combat encounter, " +
    "detail precisely the types and numbers of enemies (no stats yet!). If the challenge requires D&D in-game mechanics " +
    "to be meaningful (such as challenges that relate to a hostile environment), detail VERY SPECIFICALLY how it would " +
    "work in-game."
const { text: challengesElaborated } = await asker.ask(THREAD_MAIN, messageChallengesElaborated)

const messageRooms =
    `We are designing a D&D dungeon. The setting is as follows: ${dungeon} ${mission} ${motivation} ` +
    `\n\nThe five main challenges for the players will be:\n${challengesElaborated}\n\n` +
    "Propose 10 rooms into which to divide the dungeon. Start with just a high-level description. Make all the rooms " +
    "interesting, although they do not all need to be action-packed. Ensure the five challenges from above are all " +
    "accounted for somehow."
const { text: rooms } = await asker.ask(THREAD_MAIN2, messageRooms)
const roomsList = rooms.split('\n').map((room) => room.match(/\s*\d\d?.?\s*(.*)\s*/)?.[1]).filter(room => room)
console.log(roomsList)
assert(roomsList.length == 10)

const messageLayout =
    "What should be the layout of these rooms? The layout must serve two goals: " +
    "it should provide an exciting adventure with well-paced action and excitement building, " +
    "but it should not feel railroaded. Please suggest how the 10 rooms mentioned earlier could be connected. " +
    "Where possible, give the characters the freedom to choose multiple paths, although you should not sacrifice the story for that. " +
    "Be concise in your answer and do not repeat the room descriptions. Instead, REFER TO THE ROOMS ABOVE BY NAME. " +
    "ENSURE EVERYTHING MAKES LOGICAL SENSE AND THE CHARACTERS CAN EXPLORE THE ENTIRE DUNGEON WITHOUT GETTING STUCK! " +
    "ONLY MENTION THE LAYOUT."
const { text: layout } = await asker.ask(THREAD_MAIN2, messageLayout)

const messageConnections =
    "Repeat your last message, but anytime you introduce a connection between two rooms, " +
    "mark it with [Connection: Room 1 <-> Room 2]. Only use this mark with the 10 rooms you proposed above, " +
    "and MAKE SURE ALL CONNECTIONS ARE MARKED!"
const { text: connections } = await asker.ask(THREAD_MAIN2, messageConnections)

const messageConnectionsSummary =
    "Concisely summarize the connections. ENSURE EVERY CONNECTION MARKED [Connection] is included in your summary! " +
    "Do not repeat the marks. Try to make the summary short yet clear."
const { text: connectionsSummary } = await asker.ask(THREAD_MAIN2, messageConnectionsSummary)

const messageRoomSummaries =
    `${roomsList.join('\n')}\n\nRecall these rooms. Now state for each room:\n` +
    "- The overall amount of content in this room (low/medium/high). Ensure a good mix of this.\n" +
    "- The types of content present in this room (loot/combat/social/...)\n" +
    "- A bit more detail about the content. Keep it at the conceptual level; conciseness is important.\n\n" +
    "Separate each room's text with three dashes: ---."
const { text: roomSummaries } = await asker.ask(THREAD_MAIN2, messageRoomSummaries)
const roomSummariesList = roomSummaries.split('---').map(room => room.trim()).filter(room => room)
console.log(roomSummariesList)
assert(roomSummariesList.length == 10)

let roomTexts: string[] = []
for (let roomIndex = 1; roomIndex <= 10; ++roomIndex) {
    const thread = `room${roomIndex}`

    const messageRoom =
        `We are designing a D&D dungeon. The setting is as follows: ${dungeon} ${mission} ${motivation} ` +
        `\n\nThe room I would like to design in more detail is the following: ${roomSummariesList[roomIndex - 1]}.\n\n` +
        "Please propose a detailed description of this room. Feel free to add small things such as decorations, " +
        "minor loot... but nothing too big."
    const { text: roomDetail } = await asker.ask(thread, messageRoom)

    const messageRoomText = // TODO: WIP...
        "The ideas are very interesting, but the text is not yet suited for an entry in a D&D module. " +
        "Overhaul the text to be concise and informative, containing all the information needed for the DM to run the session, " +
        "AND NOTHING MORE. If the room contains enemies, do not describe them in any detail. " +
        "WRITE IN THE STYLE OF A D&D MODULE! Start with a short description of the room and a list of notable features " +
        "(and describe potential mechanics implications). If you mention puzzles or loot, " +
        "make sure you describe them in full detail, either within or after the features section. " +
        "Descriptions to the players can be provided between backticks, but do so SPARINGLY.\n\n" +
        "Note that this is meant for a DM; BE CONCISE, PRECISE, SPECIFIC AND COMPLETE in anything you say. " +
        "ONLY LIST SPECIFIC IN-GAME INFORMATION, NO GENERALITIES OR DM TIPS. List specifically what loot can be found, " +
        "what the precise solution to a puzzle is, how concepts translate to in-game mechanics..."
    const { text: roomText } = await asker.ask(thread, messageRoomText)
    roomTexts.push(roomText)

    // TODO: Correction and clarification cycle, probably

    // TODO: Maybe summarize previous rooms? not really necessary for an MVP tho

    // TODO: Extract enemies and loot such that they can be separately detailed
}

// TODO: Assemble nice text
