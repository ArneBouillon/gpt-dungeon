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
    "Make sure to be creative and use lots of colorful language. Give both the LOCATION/BUILDING the characters " +
    "will explore and a brief description of the SETTING (inhabitants, context, positioning) of the place. " +
    "Ensure to keep the scope very limited. The less larger narrative there is to the story, the better. " +
    "BE CREATIVE AND DON'T STICK TO CLICHES! ANSWER IN A SINGLE SENTENCE." +
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
const roomsList = rooms.split(/\d\d?./).map((room) => room.trim())
assert(roomsList.length == 10)

const messageLayout =
    "What should be the layout of these rooms? The layout must serve two goals: " +
    "it should provide an exciting adventure with well-paced action and excitement building, " +
    "but it should not feel railroaded. Please give a suggestion which includes all the 10 rooms mentioned earlier. " +
    "Where possible, give the characters the freedom to choose multiple paths, " +
    "although you should not sacrifice the story for that. Be concise in your answer and do not repeat the room descriptions. " +
    "Focus on the different paths the characters could take. " +
    "ENSURE EVERYTHING MAKES LOGICAL SENSE AND THE CHARACTERS CAN EXPLORE THE ENTIRE DUNGEON WITHOUT GETTING STUCK!"
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
    `${messageRooms}\n\nRecall these rooms. Now state for each room:\n` +
    "- The overall amount of content in this room (low/medium/high). Ensure a good mix of this. " +
    "- The types of content present in this room (loot/combat/social/...) " +
    "- A bit more detail about the content. Keep it at the conceptual level; conciseness is important."
const { text: roomSummaries } = await asker.ask(THREAD_MAIN2, messageRoomSummaries)

for (let roomIndex = 1; roomIndex <= 10; ++roomIndex) {
    const thread = `room${roomIndex}`

    const messageRoom =
        `We are designing a D&D dungeon. The setting is as follows: ${dungeon} ${mission} ${motivation} ` +
        `\n\nThe `
}
