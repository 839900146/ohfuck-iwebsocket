import { IWebSocket } from "../ws/ws";
import type { TWsHooks, TWsTriggerHooks, TWsHooksReturn } from "@/interfaces";

export class WsHooksManager {
    private hooks: {
        [K in keyof TWsTriggerHooks]: (TWsTriggerHooks[K])[]
    };
    private ws: IWebSocket;

    constructor(ws: IWebSocket) {
        this.hooks = {
            before_connect: [],
            after_connect: [],
            before_send: [],
            after_receive: [],
            before_reconnect: [],
            on_close: [],
            on_error: [],
            transform_send: [],
            transform_receive: [],
            modify_listeners: [],
        };
        this.ws = ws;
    }

    register_hook<K extends keyof TWsTriggerHooks, C extends TWsTriggerHooks[K]>(stage: K, callback: C) {
        if (this.hooks[stage]) {
            this.hooks[stage].push(callback);
            return () => {
                this.unregister_hook(stage, callback);
            }
        }
    }

    unregister_hook<K extends keyof TWsTriggerHooks, C extends TWsTriggerHooks[K]>(stage: K, callback: C) {
        let index = this.hooks[stage].indexOf(callback);
        if (index !== -1) {
            this.hooks[stage].splice(index, 1);
        }
    }

    trigger_hook<K extends keyof TWsHooks, V extends Parameters<TWsHooks[K]>>(stage: K, ...args: V): TWsHooksReturn<K> {

        const callbacks = this.hooks[stage];

        switch (stage) {
            case 'before_connect':
            case 'after_connect':
            case 'before_send':
            case 'after_receive':
            case 'before_reconnect':
            case 'on_close':
            case 'on_error':
                {
                    callbacks.forEach(cb => cb(this.ws, ...args))
                    return null as any as TWsHooksReturn<K>;
                }
            case 'transform_send':
            case 'transform_receive':
            case 'modify_listeners':
                {
                    if (callbacks.length === 0) return args[0]
                    let data: any = args[0];
                    callbacks.forEach((cb: (...args: any[]) => any) => {
                        data = cb.apply(null, [this.ws, data].concat(args.slice(1)))
                    })
                    return data
                }
            default:
                throw new Error(`Unknown hook stage: ${stage}`);
        }
    }
}