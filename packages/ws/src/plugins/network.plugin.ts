import type { IWebSocket, IWsPlugin } from '@/lib/ws/ws'

type TOptions = {
    log?: boolean
}

const default_options: TOptions = {
    log: false
}

export class NetworkPlugin implements IWsPlugin {
    name = 'NetworkPlugin'
    opts: Required<TOptions>
    private ws: IWebSocket | null = null

    constructor(opts: TOptions = {}) {
        this.opts = { ...default_options, ...opts } as Required<TOptions>
    }

    init(ws: IWebSocket): void {
        this.ws = ws

        window.addEventListener('online', this.handle_online)
        window.addEventListener('offline', this.handle_offline)
    }

    destroy(): void {
        window.removeEventListener('online', this.handle_online)
        window.removeEventListener('offline', this.handle_offline)
    }

    handle_offline = () => {
        this.log('error', '网络连接断开');
        if (this.ws) this.ws.is_connect = false
    }

    handle_online = () => {
        this.log('success', '网络连接成功');
    }

    log(type: keyof IWebSocket['log'], ...args: any[]): void {
        if (this.opts.log) {
            this.ws?.log[type](...args)
        }
    }
}