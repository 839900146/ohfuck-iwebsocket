import { SseServer, TSseServerOption } from "./sse_server";

export class SseBunServer extends SseServer {
    constructor(options: TSseServerOption) {
        super(options)
        this.start()
    }

    private start = () => {
        Bun.serve({
            port: this.options.port,
            fetch: (req) => {
                if (new URL(req.url).pathname === this.options.prefix) {
                    return this.handle(req);
                }
                return new Response();
            },
        });
        console.log(`SSE server started at http://localhost:${this.options.port}${this.options.prefix}`)
    }

    private handle = (req: Request): Response => {
        const { signal } = req
        return new Response(
            new ReadableStream({
                start: (controller) => {
                    const client_id = SseServer.create_client_id()
                    this.sse_clients.set(client_id, {
                        send: (msg: string) => {
                            controller.enqueue(msg)
                        }
                    })
                    this.notify(client_id, "connected", client_id)
                    signal.addEventListener("abort", () => {
                        controller.close();
                        this.sse_clients.delete(client_id);
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
}