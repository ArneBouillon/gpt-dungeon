import * as util from './util.js'

// const asker = new util.PromptAsker()
const asker = new util.ChatGPTAsker()

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
const { text: textActs } = await asker.ask(THREAD_MAIN, messageActs)
const acts = textActs.split(/Act #?\d: ?/).slice(1).map(act => act.trim())

let totalSummary = ""
for (let act = 1; act <= 3; act += 1) {
    const messageActElements = // TODO: Repeat the one-sentence summary of the act here in the prompt, as otherwise ChatGPT can get confused sometimes
        `Recall Act ${act}: ${acts[act - 1]}\n\n` +
        `Let us now work on Act ${act} in more detail. Write four elements that will be the base of the act. ` +
        "These can be large or small: encounters, loot, traps, interactions, art... " +
        "Remember that, together, they can only take an hour of playtime! " +
        "So make sure most of the elements are very small. BE SPECIFIC! " +
        `Ensure the elements only pertain to Act ${act}, and that they are consistent with what will later happen in the other acts. ` +
        "Reply in the format `Element #X: Y`."
    await asker.ask(THREAD_MAIN, messageActElements)

    const messageActSummary =
        `Now summarize Act ${act}, and use colorful language. ` +
        "Be precise and make sure to incorporate all the elements you mentioned above. " +
        `Do not mention Act ${act} in your summary. Do not leave out ANY CONTENT AT ALL.`
    const { text: textActSummary } = await asker.ask(THREAD_MAIN, messageActSummary)
    totalSummary += textActSummary + " "
}
totalSummary = totalSummary.trim()

const messageSections =
    `I'm writing a D&D one-shot in the following setting. ${setting} ${mission} ${motivation} The story is summarized as follows.\n\n` +
    `${totalSummary}\n\nNow imagine you're the writer of a D&D module. You will need to write in the STYLE OF A D&D MODULE.` +
    "Suggest a subdivision of the module into 6 sections. Answer in the format `Section #X: Y`. " +
    "The first section must be an introduction, where no action happens, but the characters are introduced " +
    "to the setting and their mission. Make this introduction very brief. " +
    "ENSURE YOU DO NOT LOSE ANY INFORMATION! INCLUDE ALL THE INFORMATION GIVEN ABOVE IN A SECTION! " +
    "Don't make the sections too specific on a single element; ENSURE EACH SECTION CONTAINS ENOUGH CONTENT! "
const { text: textSections } = await asker.ask(THREAD_AUX1, messageSections)
const sections = textSections.split(/Section #?\d: ?/).slice(1).map(act => act.trim())

let textPerSection: string[] = []
let runningSummary = ""
for (let sec = 2; sec <= 6; ++sec) {
    const textSectionBrief = sections[sec - 1]

    const threadSec = `aux-sec-${sec}`

    const earlierSummary = sec == 2
        ? ""
        : "The earlier sections are summarized as follows.\n\n" +
            `${runningSummary}\n\n`
    const messageSectionText =
        "Imagine you're the writer of a D&D module. " +
        "You will need to write in the STYLE OF A D&D MODULE. " +
        `${earlierSummary}` +
        `Section ${sec} of the module is summarized as follows.\n\n${textSectionBrief}\n\n` +
        `Write out a FOCUSED full-text version OF SECTION ${sec} ONLY. ` +
        "ADD MORE DETAIL. BE SPECIFIC! Keep in mind that you're writing this for the DM, not the players. " +
        "BE SPECIFIC, especially with regards to rewards (specify the exact reward), " +
        "loot (specify the exact loot), enemies... Don't include filler text, such as advice to the DM. " +
        "Be brief! Include as much specific information as possible, such as the exact contents of loot, " +
        "exact rewards, specific elements of the environment... Avoid non-specific language, " +
        "such as \"including\" or \"such as\", at all cost. DONT START WITH \"Welcome to\". " +
        `Again, I JUST WANT SECTION ${sec}. Do not include story hooks. Answer in full text, not bullet points.`
    const { text: textSectionText } = await asker.ask(threadSec, messageSectionText)

    // TODO: Check for extra content added on
    // Way to do this:
    /*
        Recall that the summary was:
        ...

        What is the end point of this summary?

        ---

        In your section, did you add parts that are chronologically situated after this end point?  I'm only interested in extra content that comes CHRONOLOGICALLY AFTER the summary, extra stuff during the story is fine. If yes, shortly mention which part. If no, that's fine as well. Start your answer with the word "yes" or "no".

        --- (If starts with yes:)

        <Ask it to restate. It may be necessary to make it repeat its text first.>
     */

    // TODO: Check for vague language that talks about the players and their challenges in an abstract way. Something that kind of works:
    /*
        Did you include any text that talks about the characters in a vague or abstract way, without contributing anything concrete? I'm talking about phrases like "the stakes are high for the characters", "the characters will need to use all of their skills"... Any phrase that talks about the challenges for the players in an abstract way, counts.

        Mention precisely ALL the places where you used text like this. Include as many as you possibly can. Do not provide a revised version, but simply list the instances. Only include phrases that specifically mention the players.
     */

    const messageSectionShorter =
        "That looks good, but it's a bit too long. Shorten the text by removing generic statements and vague speculation. " +
        "Definitely remove fragments that look forward to later parts of the adventure, without being relevant to this part. " +
        "REMOVE POTENTIAL REWARDS THAT ARE NOT TIED TO A SPECIFIC PLACE/TASK. " +
        "DO NOT INCLUDE A VAGUE FINAL PARAGRAPH THAT TALKS ABOUT THE REST OF THE ADVENTURE. DO NOT MENTION THE DM."
    const { text: textSectionText2 } = await asker.ask(threadSec, messageSectionShorter)

    const threadSec2 = `aux-sec-${sec}-2`

    const messageSectionUnspecific =
        `${textSectionText2}\n\nEND TEXT\n\n` +
        "The above section (TEXT) is meant to feature in a D&D module, and the DM uses the text to run the module. " +
        "However, the text is not yet specific enough, often giving examples instead of citing what exactly the characters encounter. " +
        "Identify all the elements that are not yet specific enough for a DM to properly run the adventure. " +
        "Pay special attention to whether the characters have all the information and clues needed to progress. " +
        "DO NOT INCLUDE ELEMENTS THAT WILL LIKELY BE DETAILED IN LATER PARTS OF THE ADVENTURE, " +
        "such as locations or NPCs the characters are told about but haven't visited yet."
    await asker.ask(threadSec2, messageSectionUnspecific)

    // TODO: Filter on what is relevant to this section

    const messageSectionUnspecific2 =
        "Please fill in the specifics of the points left unclear, bearing in mind that the adventure " +
        "is meant for characters of level 3, meaning everything should be balanced for level 3. " +
        "DO NOT INTRODUCE ADDITIONAL CONTENT, LOCATIONS OR NPCs by doing this (unless absolutely necessary), " +
        "but just ensure the story is concrete and logical. DO NOT INTRODUCE NEW COMBAT! I REPEAT: NO NEW COMBAT! " +
        "Make sure it is clear how the characters should acquire any potential clues."
    await asker.ask(threadSec2, messageSectionUnspecific2)

    const messageSectionUnspecific3 =
        "Write out a FOCUSED full-text version of the section given above, incorporating your specific changes. " +
        "BE SPECIFIC! Keep in mind that you're writing this for the DM, not the players. Don't include filler text, " +
        "such as advice to the DM. Be brief! Include as much specific information as possible, " +
        "such as the exact contents of loot, exact rewards, specific elements of the environment... " +
        "Avoid non-specific language, such as \"including\" or \"such as\", at all cost. " +
        "DON'T START WITH \"Welcome to\". Again, I JUST WANT THE GIVEN SECTION. Do not include story hooks. " +
        "Answer in full text, not bullet points."
    const { text: textSectionText3 } = await asker.ask(threadSec2, messageSectionUnspecific3)
    textPerSection.push(textSectionText3)

    // TODO: Check for logic flaws

    const earlierSummary1 = sec == 2
        ? ""
        : `Combine it with the following summary of previous sections:${runningSummary}\n\nEND PREVIOUS SUMMARY\n\n`
    const earlierSummary2 = sec == 2
        ? ""
        : "Again, CREATE ONE SUMMARY THAT CONTAINS BOTH THE PREVIOUS SUMMARY AND " +
        "INFORMATION ABOUT THE CURRENT SECTION. COMBINE IT ALL INTO A SINGLE SUMMARY THAT DOES NOT DISTINGUISH BETWEEN SECTIONS."
    const messageSectionSummary =
        "Looks great! Please summarize the parts of what the characters encounter in this section " +
        `that will be most relevant to a writer of later sections of the adventure. ${earlierSummary1}` +
        "Be brief, but include as much relevant information as possible. " +
        "Also make sure to include anything that this section sets up for later in the adventure, such as mysteries, " +
        "promises, riddles... Have a first part of the summary for what has already happened, and a second part for " +
        `potential things set up for later. ${earlierSummary2}` +
        "Only include elements that will be relevant to a writer of later sections."
    const { text: textSectionSummary } = await asker.ask(threadSec2, messageSectionSummary)
    runningSummary = textSectionSummary
}
