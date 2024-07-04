import type { IWebSocket, IWsPlugin } from '@/lib/ws/ws'

type TOptions = {
    /** 开启日志输出 */
    log?: boolean
    /** 最大暂存数 */
    max_msgs?: number
    /** 开启持久保存离线消息 */
    persist_offline_msgs?: boolean
}

const default_options: TOptions = {
    log: false,
    max_msgs: 500,
    persist_offline_msgs: false
}

export class StashMsgPlugin implements IWsPlugin {
    name: string = 'StashMsgPlugin'
    stash_send_msgs: Set<unknown>
    opts: Required<TOptions>
    private ws: IWebSocket | null = null

    private store_key = `iws-stash-offline-msg`

    constructor(opts: TOptions = {}) {
        this.stash_send_msgs = new Set()
        this.opts = { ...default_options, ...opts } as Required<TOptions>
    }

    async init(ws: IWebSocket) {
        this.ws = ws

        ws.add_listener('open', async () => {
            // 加载离线消息
            await this.persist_msg('load')
            // 发送暂存的消息
            const msgs = Array.from(this.stash_send_msgs)
            if (msgs.length > 0) {
                this.log('info', '发送暂存的消息', msgs)
                for (const msg of msgs) {
                    ws.send(msg)
                    this.stash_send_msgs.delete(msg)
                }
            }
        })
    }

    destroy(): void {
        this.stash_send_msgs.clear()
        this.ws = null
    }

    send_data(data: unknown): void {
        // 暂存离线消息
        if (this.ws?.is_connect) return

        this.stash_send_msgs.add(data)
        this.log('info', '暂存离线消息', data)
        // 如果暂存消息超过最大数，则清理最早的消息，保持消息数在最大数以下
        if (this.stash_send_msgs.size > this.opts.max_msgs) {
            this.stash_send_msgs.delete(this.stash_send_msgs.values().next().value)
        }

        // 持久化暂存消息
        this.persist_msg('set')
    }

    // 持久化暂存消息
    private async persist_msg(action: 'get' | 'set' | 'load') {
        return new Promise<any[] | void>(async (resolve) => {

            if (!this.opts.persist_offline_msgs) return resolve()
            
            if (action === 'get') {
                const msgs = localStorage.getItem(this.store_key)
                return resolve(msgs ? JSON.parse(msgs) : [])
            }

            if (action === 'set') {
                const msgs = Array.from(this.stash_send_msgs)
                localStorage.setItem(this.store_key, JSON.stringify(msgs))
                if (this.opts.persist_offline_msgs) {
                }
                return resolve()
            }

            if (action === 'load') {
                const msg = await this.persist_msg('get')
                this.stash_send_msgs = new Set(msg || [])
                localStorage.removeItem(this.store_key)
                return resolve()
            }
        })
    }

    private log(type: keyof IWebSocket['log'], ...args: any[]): void {
        if (this.opts.log) {
            this.ws?.log[type](...args)
        }
    }
}