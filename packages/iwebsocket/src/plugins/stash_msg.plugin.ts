import type { WsHooksManager } from '@/lib/hooks/hooks_manage'
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
    log!: (type: keyof IWebSocket['log'], ...args: any[]) => void
    private store_key = `iws-stash-offline-msg`

    constructor(opts: TOptions = {}) {
        this.stash_send_msgs = new Set()
        this.opts = { ...default_options, ...opts } as Required<TOptions>
    }

    init = async (ws: IWebSocket) => {
        this.log = (type: keyof IWebSocket['log'], ...args: any[]) => {
            if (this.opts.log) {
                ws.log[type](...args)
            }
        }
    }

    destroy = (_ws: IWebSocket, hooks_manager: WsHooksManager): void => {
        this.stash_send_msgs.clear()
        hooks_manager.unregister_hook('after_connect', this.handle_after_connect)
        hooks_manager.unregister_hook('before_send', this.handle_before_send)
    }

    register_hooks = (hooks_manager: WsHooksManager) => {
        // 连接成功后，加载离线消息并发送
        hooks_manager.register_hook('after_connect', this.handle_after_connect)
        // 发送消息前，如果当前socket处于断开状态，则暂存消息
        hooks_manager.register_hook('before_send', this.handle_before_send)
    }

    // 处理发送消息前的钩子
    private handle_before_send = (ws: IWebSocket, data: unknown) => {
        if (ws.is_connect) return

        this.stash_send_msgs.add(data)
        this.log('info', '暂存离线消息', data)
        // 如果暂存消息超过最大数，则清理最早的消息，保持消息数在最大数以下
        if (this.stash_send_msgs.size > this.opts.max_msgs) {
            this.stash_send_msgs.delete(this.stash_send_msgs.values().next().value)
        }

        // 持久化暂存消息
        this.persist_msg('set')
    }

    // 处理连接成功后的钩子
    private handle_after_connect = async (ws: IWebSocket) => {
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
    }

    // 持久化暂存消息
    private persist_msg = async (action: 'get' | 'set' | 'load') => {
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
}