import { SseExpressServer } from "@/lib/sse_express_server";

export {}

declare global {
    namespace Express {
        interface Request {
            __sse__: SseExpressServer
        }
    }
}