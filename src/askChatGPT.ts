import * as fs from "fs"
import { ChatGPTUnofficialProxyAPI } from "chatgpt"

const token = fs.readFileSync('.token', 'utf-8').trim()
const model = fs.readFileSync('model.txt', 'utf-8').trim()
const message = fs.readFileSync('message.txt', 'utf-8').trim()
const parentMessageId = fs.readFileSync('parent-message-id.txt', 'utf-8').trim()
const conversationId = fs.readFileSync('conversation-id.txt', 'utf-8').trim()

const api = new ChatGPTUnofficialProxyAPI({
    accessToken: token,
    // apiReverseProxyUrl: 'https://bypass.churchless.tech/api/conversation',
    apiReverseProxyUrl: 'https://ai.fakeopen.com/api/conversation',
    // apiReverseProxyUrl: 'https://api.pawan.krd/backend-api/conversation',
    debug: true,
    model,
})

const options = parentMessageId ? { parentMessageId, conversationId } : {}
const res = await api.sendMessage(message, options)

fs.writeFileSync('output.txt', res.text)
fs.writeFileSync('new-parent-message-id.txt', res.parentMessageId!)
fs.writeFileSync('new-conversation-id.txt', res.conversationId!)
