const sse_clients = new Map<string, ReadableStreamDefaultController<any>>()

type TSseType = 'connect' | 'demo1' | 'demo2' | 'demo3'

function sendSseMsg(client_id: string, type: TSseType, msg: any) {
    const client = sse_clients.get(client_id)
    if (!client) return
    client.enqueue(serializeMsg(200, msg, type))
}

export function serializeMsg(code: 200 | 400 | 403 | 404 | 500, data: any, type: TSseType) {
    return `
event: ${type}
data: ${JSON.stringify({ code, data })} \n\n
    `
}

function sse(req: Request): Response {
    const { signal } = req
    return new Response(
        new ReadableStream({
            start(controller) {
                const client_id = (Math.random() * 10).toString(16).slice(2)
                sse_clients.set(client_id, controller)
                sendSseMsg(client_id, "connect", "connected")

                setTimeout(() => {
                    sendSseMsg(client_id, "demo1", "demo1")
                }, 5000)

                setInterval(() => {
                    sendSseMsg(client_id, "demo2", {
                        time: new Date().toISOString(),
                        random: Math.random(),
                    })
                }, 1000)

                signal.addEventListener("abort", () => {
                    controller.close();
                    sse_clients.delete(client_id);
                });
            }
        }),
        {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        }
    )
}

Bun.serve({
    port: 10003,
    fetch(req) {
        if (new URL(req.url).pathname === "/sse") {
            return sse(req);
        }
        return new Response("Hello, World!");
    },
});