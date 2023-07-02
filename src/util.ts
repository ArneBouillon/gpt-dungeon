import * as fs from 'fs'
import clipboard from 'clipboardy'

import { execFileSync } from 'child_process'

export { ChatGPTAsker, PromptAsker, getTempThread }

let stdin = fs.openSync("/dev/stdin","rs")

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

let tempThreadCount = 0
function getTempThread() {
    tempThreadCount++
    return `temp_${tempThreadCount}`
}

const prompt = function(message) {
    fs.writeSync(process.stdout.fd, message)
    let s = ''
    let buf = Buffer.alloc(1)
    fs.readSync(stdin,buf,0,1,null)
    while (buf[0] !== 92) { // Stop parsing input at a backslash character
        s += buf
        fs.readSync(stdin,buf,0,1,null)
    }
    return s
}

interface Asker {
    ask: (threadID: number, message: string) => Promise<{
        text: string,
    }>

    rollback: (threadID: number) => void

    finalize: () => void
}

class PromptAsker implements Asker {
    private count = 0

    public async ask(threadID, message) {
        ++this.count

        const totalMessage = `IN THREAD ${threadID}:\n${message}\n\n`
        clipboard.writeSync(message)
        const ans = prompt(totalMessage)
        console.log('\n\n')
        return { text: ans }
    }

    public rollback(_threadID) {}

    public finalize() {
        console.log(`Number of asks: ${this.count}`)
    }
}

class ChatGPTThread {
    private messages: string[] = []
    private conversationId: string | null = null
    private messageIds: string[] = []

    public add(message: string, output: string, newConversationId: string, newParentMessageId: string) {
        this.messages.push(message, output)
        this.conversationId = newConversationId
        this.messageIds.push(newParentMessageId)
        console.log(message + "\n\n---------\n\n")
        console.log(output + "\n\n---------\n\n")
    }

    public rollback() {
        this.messageIds.pop()
    }

    public getOptions() {
        return this.conversationId ? {
            conversationId: this.conversationId,
            parentMessageId: this.messageIds[this.messageIds.length - 1],
        } : {}
    }
}

class ChatGPTAsker implements Asker {
    private count = 0
    private threads = new Map<string, ChatGPTThread>
    private readonly abortOnError
    private readonly model

    public constructor(abortOnError, model = 'text-davinci-003') {
	this.abortOnError = abortOnError
        this.model = model
    }

    public async ask(threadID, message, action: string | null = null) {
	console.log("Starting ask!")
        if (action === 'continue') console.log("\n\n----------\n\nDOING A CONTINUE!\n\n----------\n\n")
        ++this.count

        if (!this.threads.has(threadID)) this.threads.set(threadID, new ChatGPTThread())
        const thread = this.threads.get(threadID)!

        const options = thread.getOptions()

        let output, newConversationId, newParentMessageId
        let attempts = 0
        while (true) {
            await sleep(3000)

            try {
                fs.writeFileSync('output.txt', '')
                fs.writeFileSync('new-conversation-id.txt', '')
                fs.writeFileSync('new-parent-message-id.txt', '')
                fs.writeFileSync('model.txt', this.model)
                fs.writeFileSync('action.txt', action || "")

                fs.writeFileSync('message.txt', message)
                fs.writeFileSync('conversation-id.txt', options.conversationId || '')
                fs.writeFileSync('parent-message-id.txt', options.parentMessageId || '')

                console.log('Execing')
                execFileSync('./src/ask_chat_gpt.sh')
                console.log('Ending exec')

                output = fs.readFileSync('output.txt', 'utf-8').trim()
                if (output) {
                    newConversationId = fs.readFileSync('new-conversation-id.txt', 'utf-8').trim()
                    newParentMessageId = fs.readFileSync('new-parent-message-id.txt', 'utf-8').trim()

                    break
                } else throw Error()
            } catch {
                attempts++
                if (attempts >= 20) {
                    console.log("Errors keep coming, I'm going to stop retrying now!")
		    if (this.abortOnError) throw Error()
                    const retry = prompt("Do you want to keep going anyway? [y/n]\n")
                    if (retry.includes('y'))
                        attempts = 0
                    else
                        throw Error()
                } else {
                    console.log(`Errored; attempt ${attempts + 1} coming up`)
                }
            }
        }
        thread.add(message, output, newConversationId, newParentMessageId)
	    console.log("Ending ask!")
        return { text: output }
    }

    public rollback(threadID) {
        this.threads.get(threadID)!.rollback()
    }

    public finalize() {
        console.log(`Number of asks: ${this.count}`)
    }
}
