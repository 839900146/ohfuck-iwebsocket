import { SseClient } from "./lib/sse_client";

const sse_client = new SseClient({
    url: "/sse",
})

sse_client.add_listener("connected", (msg) => {
    console.log('sse connected', msg)
})

sse_client.add_listener("demo1", (msg) => {
    console.log('this is demo1', msg)
})

let unsubscripe = sse_client.add_listener<string>('demo2', (msg) => {
    console.log('this is demo2, the msg type is string', msg)
    unsubscripe()
})