import type { Server } from "bun";

Bun.serve({
    port: 10002,
    websocket: {
        message(ws, message) {
            if (message === 'ping') {
                ws.send('pong')
            } else {
                console.log(message);
            }
        },
    },
    fetch: function (req: Request, server: Server) {
        if (server.upgrade(req)) {
            return;
        }
        return new Response("Upgrade failed", { status: 500 });
    }
})