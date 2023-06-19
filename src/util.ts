import {ChatGPTUnofficialProxyAPI, ChatMessage} from 'chatgpt'
import * as fs from 'fs'
import clipboard from 'clipboardy'

export { ChatGPTAsker, PromptAsker, getTempThread }

let stdin = fs.openSync("/dev/stdin","rs");

let tempThreadCount = 0
function getTempThread() {
    tempThreadCount++
    return `temp_${tempThreadCount}`
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const prompt = function(message) {
    fs.writeSync(process.stdout.fd, message);
    let s = '';
    let buf = Buffer.alloc(1);
    fs.readSync(stdin,buf,0,1,null);
    while (buf[0] != 92) { // Stop parsing input at a backslash character
        s += buf;
        fs.readSync(stdin,buf,0,1,null);
    }
    return s;
}


const tokens = fs.readFileSync('.token', 'utf-8')

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
    private ress: ChatMessage[] = []
    private lastRes: ChatMessage | null = null

    public api: ChatGPTUnofficialProxyAPI

    public constructor(apis) {
        this.api = apis[Math.floor(Math.random()*apis.length)]
    }

    public add(message: string, res: ChatMessage) {
        this.messages.push(message, res.text)
        this.ress.push(res)
        this.lastRes = res
        console.log(message + "\n\n---------\n\n")
        console.log(res.text + "\n\n---------\n\n")
    }

    public rollback() {
        this.ress.pop()
        this.lastRes = this.ress.length > 0 ? this.ress[this.ress.length - 1] : null
    }

    public getOptions() {
        return this.lastRes ? {
            conversationId: this.lastRes.conversationId,
            parentMessageId: this.lastRes.id,
        } : {}
    }
}

class ChatGPTAsker implements Asker {
    private count = 0
    private threads = new Map<string, ChatGPTThread>
    private readonly apis

    public constructor(model = 'text-davinci-003') {
        this.apis = tokens.split('\n').map(
            token => new ChatGPTUnofficialProxyAPI({
                accessToken: token,
                // apiReverseProxyUrl: 'https://bypass.churchless.tech/api/conversation',
                apiReverseProxyUrl: 'https://ai.fakeopen.com/api/conversation',
                // apiReverseProxyUrl: 'https://api.pawan.krd/backend-api/conversation',
                debug: true,
                model,
            })
        )
    }

    public async ask(threadID, message) {
        ++this.count

        if (!this.threads.has(threadID)) this.threads.set(threadID, new ChatGPTThread(this.apis))
        const thread = this.threads.get(threadID)!

        const options = thread.getOptions()
        let res
        let attempts = 0
        while (true) {
            try {
                await sleep(3000)
                res = await thread.api.sendMessage(message, options)
                break
            } catch(err) {
                console.log(err)
                attempts++
                if (attempts >= 100 || (attempts >= 10 && !`${err}`.includes('non-whitespace'))) {
                    console.log("Errors keep coming, I'm going to stop retrying now!")
                    const retry = prompt("Do you want to keep going anyway? [y/n]\n")
                    if (retry.includes('y'))
                        attempts = 0
                    else
                        throw err
                } else {
                    console.log(`Errored; attempt ${attempts + 1} coming up`)
                }
            }
        }
        thread.add(message, res)
        return {
            text: res.text,
        }
    }

    public rollback(threadID) {
        this.threads.get(threadID)!.rollback()
    }

    public finalize() {
        console.log(`Number of asks: ${this.count}`)
    }
}
