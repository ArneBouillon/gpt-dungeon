import {ChatGPTUnofficialProxyAPI, ChatMessage} from 'chatgpt'
import * as fs from 'fs'
import clipboard from 'clipboardy'

export { ChatGPTAsker, PromptAsker }

let stdin = fs.openSync("/dev/stdin","rs");

const prompt = function(message) {
    fs.writeSync(process.stdout.fd, message);
    let s = '';
    let buf = Buffer.alloc(1);
    fs.readSync(stdin,buf,0,1,null);
    while (buf[0] != 92) {
    // while((buf[0] != 10) && (buf[0] != 13)) {
        s += buf;
        fs.readSync(stdin,buf,0,1,null);
    }
    return s;
}


const token = fs.readFileSync('.token', 'utf-8')
const api = new ChatGPTUnofficialProxyAPI({
    accessToken: token,
    // apiReverseProxyUrl: 'https://bypass.churchless.tech/api/conversation',
    apiReverseProxyUrl: 'https://api.pawan.krd/backend-api/conversation',
    // debug: true,
})

interface Asker {
    ask: (threadID: number, message: string) => Promise<{
        text: string,
    }>
}

class PromptAsker {
    public async ask(threadID, message) {
        const totalMessage = `IN THREAD ${threadID}:\n${message}\n\n`
        clipboard.writeSync(message)
        const ans = prompt(totalMessage)
        console.log('\n\n')
        return { text: ans }
    }
}

class ChatGPTThread {
    private messages: string[] = []
    private lastRes: ChatMessage | null = null

    public add(message: string, res: ChatMessage) {
        this.messages.push(message, res.text)
    }

    public getOptions() {
        return this.lastRes ? {
            conversationId: this.lastRes.conversationId,
            parentMessageId: this.lastRes.id,
        } : {}
    }
}

class ChatGPTAsker implements Asker {
    private threads = new Map<string, ChatGPTThread>

    public async ask(threadID, message) {
        const thread: ChatGPTThread = this.threads.has(threadID) ? this.threads[threadID] : (this.threads[threadID] = new ChatGPTThread)

        const options = thread.getOptions()
        const res = await api.sendMessage(message, options)
        thread.add(message, res)
        return {
            text: res.text,
        }
    }
}
