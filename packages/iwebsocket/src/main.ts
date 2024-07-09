import { IWebSocket, NetworkPlugin } from "./build";
import { StashMsgPlugin } from "./plugins/stash_msg.plugin";

const ws = new IWebSocket("ws://localhost:10002", {
    hartbeat: {
        enable: true,
        interval: 5
    },
    plugins: [
        new StashMsgPlugin({ persist_offline_msgs: true, log: true }),
        new NetworkPlugin({ log: true })
    ]
})

ws.add_listener('open', () => {
    setInterval(() => ws.send(Date.now()), 3000)
})

ws.add_listener('message', (msg) => {
    console.log('message', msg)
})