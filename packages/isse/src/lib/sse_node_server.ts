import { SseServer, TSseServerOption } from "./sse_server";
import { createServer, type IncomingMessage, ServerResponse } from 'http'

export class SseNodeServer extends SseServer {
    constructor(options: TSseServerOption) {
        super(options)
        this.start()
    }

    private start = () => {
        const server = createServer((req, res) => {
            if (req.url === this.options.prefix) {
                return this.handle(req, res)
            }
            res.statusCode = 404
            res.end()
        })
        server.listen(this.options.port, () => {
            console.log(`SSE server started at http://localhost:${this.options.port}${this.options.prefix}`)
        })
    }

    private handle = (req: IncomingMessage, res: ServerResponse) => {
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
        })
        const client_id = SseServer.create_client_id()
        this.sse_clients.set(client_id, {
            send: (msg: string) => {
                res.write(msg)
            }
        })
        res.write('')
        this.notify(client_id, "connected", client_id)
        req.on('close', () => {
            res.end();
            this.sse_clients.delete(client_id);
        })
    }
}