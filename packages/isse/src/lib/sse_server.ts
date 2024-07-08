export type TSseServerOption = {
    port: number;
    prefix: string;
}

export type TSseClientMap = Map<string, {
    send: (msg: string) => void
}>;

export class SseServer {
    protected options: TSseServerOption;
    protected sse_clients: TSseClientMap;

    constructor(options: TSseServerOption) {
        this.options = Object.assign({
            port: 8080,
            prefix: "/sse",
        }, options);
        this.sse_clients = new Map()
    }

    protected static stringify_event_data(type: string, data: any) {
        return `event: ${type}\ndata: ${JSON.stringify(data)} \n\n`
    }

    protected static create_client_id() {
        return (Math.random() * 10).toString(16).slice(2)
    }

    /** 1对1通知 */
    notify = (client_id: string, type: string, msg: any) => {
        const client = this.sse_clients.get(client_id)
        if (!client) return
        client.send(SseServer.stringify_event_data(type, msg))
    }

    /** 广播通知 */
    broadcast = (type: string, msg: any) => {
        for (const client of this.sse_clients.values()) {
            client.send(SseServer.stringify_event_data(type, msg))
        }
    }
}