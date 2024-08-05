import type { IWebSocket } from "@/lib/ws/ws";
import type { WsHooksManager } from "@/lib/hooks/hooks_manage";

export type TListenerFn<T = any> = (msg: T) => void

export type TListeners = {
    message: TListenerFn<any>[]
    open: TListenerFn<Event>[]
    close: TListenerFn<CloseEvent>[]
    error: TListenerFn<Event>[]
    newwork_status: TListenerFn<boolean>[]
}

export type TWsOptions = {
    reconnect_interval?: number
    max_reconnect_attempts?: number
    hartbeat?: {
        enable?: boolean
        interval?: number
        ping?: string
        pong?: string
    },
    plugins?: IWsPlugin[]
}

export interface IWsPlugin {
    name: string
    init(ws: IWebSocket): void
    destroy(ws: IWebSocket, hooks_manager: WsHooksManager): void
    register_hooks?: (hooks_manager: WsHooksManager) => void
}