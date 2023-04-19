import * as util from './util.js'

const asker = new util.PromptAsker()

const THREAD_MAIN = 'main'
const THREAD_AUX1 = 'aux1'

const messageSetting =
    "We are going to design a D&D one-shot for third-level characters. " +
    "We will take things step-by-step, going from a high abstraction level to a lower one. " +
    "First, give ONE suggestion for the setting of the story. Answer IN A SINGLE SENTENCE. " +
    "Make sure to be creative and use lots of colorful language. " +
    "Ensure to keep the scope very limited. The less larger narrative there is to the story, the better."
const { text: setting } = await asker.ask(THREAD_MAIN, messageSetting)

const messageMission =
    "Perfect! Now we need to add some meat to the story. " +
    "On a high level, what will be the characters' mission? " +
    "Suggest a BRIEF, SELF-CONTAINED goal WITH A SMALL SCOPE that can be managed in a single session. " +
    "You can be creative! DO NOT MAKE IT a retrieval mission. Be SPECIFIC. " +
    "Do not yet mention their motivation for this goal."
const { text: mission } = await asker.ask(THREAD_MAIN, messageMission)

const messageMotivation =
    "That sounds good. Now suggest an interesting motivation for the characters to do this. " +
    "Ensure it can apply to any set of characters that might play the one-shot!"
const { text: motivation } = await asker.ask(THREAD_MAIN, messageMotivation)

const messageActs =
    "Let us divide the story into three main acts. " +
    "Ensure each is focused on one main aspect and does not use elements that do not appear in any of the acts. " +
    "KEEP THE AMOUNT OF CONTENT LIMITED, since it's only a one-shot! " +
    "Try to be creative! You don't necessarily need to use a standard story structure. " +
    "ENSURE EACH ACT CAN BE COMPLETED IN ABOUT AN HOUR OF PLAYTIME. Be specific! " +
    "Describe each act IN ONE SENTENCE. Reply in the format `Act #X: Y`."
await asker.ask(THREAD_MAIN, messageActs)

let totalSummary = ""
for (let act = 1; act <= 3; act += 1) {
    const messageActElements =
        `Let us now work on Act ${act} in more detail. Write four elements that will be the base of the act. ` +
        "These can be large or small: encounters, loot, traps, interactions, art... " +
        "Remember that, together, they can only take an hour of playtime! " +
        "So make sure at least some of the elements are very small. BE SPECIFIC! " +
        `Ensure the elements only pertain to Act ${act}, and that they are consistent with what will later happen in the other acts. ` +
        "Reply in the format `Element #X: Y`."
    await asker.ask(THREAD_MAIN, messageActElements)

    const messageActSummary =
        `Now summarize Act ${act}, and use colorful language. Be sure to incorporate all the elements you mentioned above. ` +
        `Do not mention Act ${act} in your summary.`
    const { text: textActSummary } = await asker.ask(THREAD_MAIN, messageActSummary)
    totalSummary += textActSummary + " "
}
totalSummary = totalSummary.trim()

const messageSections =
    `I'm writing a D&D one-shot in the following setting. ${setting} ${mission} ${motivation} The story is summarized as follows.\n\n` +
    `${totalSummary}\n\nNow imagine you're the writer of a D&D module. You will need to write in the STYLE OF A D&D MODULE. ` +
    "Suggest a subdivision of the module into 5 sections. Answer in the format `Section #X: Y`."
await asker.ask(THREAD_AUX1, messageSections)

const messageSectionsWithSummary =
    `Recall the summary\n\n${totalSummary}\n\n` +
    "For each section, mention the relevant parts of the summary. " +
    "Be verbose, and make sure you don't lose relevant information."
await asker.ask(THREAD_AUX1, messageSectionsWithSummary)

let textPerSection: string[] = []
for (let sec = 1; sec <= 5; ++sec) {
    const messageSectionBrief = `Repeat exactly the part corresponding to Section ${sec}`
    const { text: textSectionBrief } = await asker.ask(THREAD_AUX1, messageSectionBrief)

    const threadSec = `aux-sec-${sec}`

    const messageSectionText =
        "Imagine you're the writer of a D&D module. " +
        "You will need to write in the STYLE OF A D&D MODULE. " +
        `Section ${sec} of the module is summarized as follows.\n\n${textSectionBrief}\n\n` +
        `Write out a FOCUSED full-text version OF SECTION ${sec} ONLY.` +
        "ADD MORE DETAIL. BE SPECIFIC! Keep in mind that you're writing this for the DM, not the players. " +
        "BE SPECIFIC, especially with regards to rewards (specify the exact reward), " +
        "loot (specify the exact loot), enemies... Don't include filler text, such as advice to the DM. " +
        "Be brief! Include as much specific information as possible, such as the exact contents of loot, " +
        "exact rewards, specific elements of the environment... Avoid non-specific language, " +
        "such as \"including\" or \"such as\", at all cost. DONT START WITH \"Welcome to\". " +
        `Again, I JUST WANT SECTION ${sec}. Do not include story hooks. Answer in full text, not bullet points.`
    const { text: textSectionText } = await asker.ask(threadSec, messageSectionText)

    // TODO: Make the resulting text briefer

    const threadSec2 = `aux-sec-${sec}-2`

    const messageSectionUnspecific =
        `${textSectionText}\n\nEND TEXT\n\n` +
        "The above section is meant to feature in a D&D module, and the DM uses the text to run the module. " +
        "However, the text is not yet specific enough, often giving examples instead of citing what exactly " +
        "the characters encounter. Identify all the elements that are not yet specific enough for a DM to " +
        "properly run the adventure."
    await asker.ask(threadSec2, messageSectionUnspecific)

    const messageSectionUnspecific2 =
        "All good points! Please fill in the specifics of these points, " +
        "bearing in mind that the adventure is meant for characters of level 3, " +
        "meaning everything should be balanced for level 3."
    await asker.ask(threadSec2, messageSectionUnspecific2)

    const messageSectionUnspecific3 =
        "That sounds good! Please add these specifics to the original section I gave you. " +
        "Take care to not change any of the content if it is not needed."
    const { text: textSectionText2 } = await asker.ask(threadSec2, messageSectionUnspecific3)

    const messageSectionSummary =
        "Looks great! Please summarize the parts of what the characters encounter in this section " +
        "that will be most relevant to a writer of later sections of the adventure. " +
        "Be brief, but include as much relevant information as possible. " +
        "Also make sure to include anything that this section sets up for later in the adventure, " +
        "such as mysteries, promises, riddles... Have a first part of the summary for what has already happened, " +
        "and a second part for potential things set up for later."
    const { text: textSectionSummary } = await asker.ask(threadSec2, messageSectionSummary)
}
