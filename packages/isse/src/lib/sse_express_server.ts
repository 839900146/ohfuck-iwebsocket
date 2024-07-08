import { SseServer, TSseServerOption } from "./sse_server";

export class SseExpressServer extends SseServer {
    inited: boolean;
    constructor(options: Pick<TSseServerOption, 'prefix'>) {
        super(options as TSseServerOption)
        this.inited = false
    }

    start = (req: any, res: any, next: () => void) => {
        req['__sse__'] = this
        if (req.url === this.options.prefix) {
            return this.handle(req, res, next)
        } else {
            next()
        }
    }

    private handle = (req: any, res: any, next: () => void) => {
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
        next()
    }
}