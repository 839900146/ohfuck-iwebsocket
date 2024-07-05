const sse_clients = new Map<string, ReadableStreamDefaultController<any>>()

function sendSseMsg(client_id: string, msg: any, type: 'handle_state' | 'upload' | 'connect') {
    const client = sse_clients.get(client_id)
    if (!client) return
    client.enqueue(serializeSSE(200, msg, type))
}

export function serializeSSE(code: 200 | 400 | 403 | 404 | 500, data: any, type: string) {
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
                sendSseMsg(client_id, client_id, 'connect')
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