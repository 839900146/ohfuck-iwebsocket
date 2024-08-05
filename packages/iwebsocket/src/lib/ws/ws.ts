import { beautify_log } from "@/utils"
import { WsHooksManager } from "@/lib/hooks/hooks_manage"
import type { IWsPlugin, TListeners, TWsOptions } from "@/interfaces"

export class IWebSocket {
    options: any
    is_connect: boolean
    log = new Proxy(Object.freeze(beautify_log), {
        set: () => {
            throw new Error('ws.log is a frozen object')
        },
        defineProperty: () => {
            throw new Error('ws.log is a frozen object')
        }
    })

    private url: string
    private socket: null | WebSocket
    private reconnect_attempts: number
    private max_reconnect_attempts: any
    private reconnect_interval: any
    private reconnect_enable: boolean
    private listeners: TListeners
    private heartbeat_timer: ReturnType<typeof setTimeout> | null
    private hartbeat: { enable: boolean, interval: number, ping: string; pong: string }
    private plugins: IWsPlugin[]
    private hooks_manager: WsHooksManager


    constructor(url: string, options: TWsOptions = {}) {
        this.url = url
        this.options = options
        this.socket = null
        this.is_connect = false
        this.reconnect_attempts = 0
        this.reconnect_enable = true
        this.max_reconnect_attempts = options.max_reconnect_attempts || Infinity
        this.reconnect_interval = options.reconnect_interval || 3000
        this.hartbeat = {
            enable: false,
            interval: 30,
            ping: 'ping',
            pong: 'pong',
            ...(options.hartbeat || {})
        }
        this.heartbeat_timer = null
        this.listeners = {
            message: [],
            open: [],
            close: [],
            error: [],
            network_status: []
        }

        this.plugins = options.plugins || []

        // 初始化hooks管理器
        this.hooks_manager = new WsHooksManager(this)

        // 注册插件的hooks
        this.plugins.forEach(plugin => {
            plugin.init(this)
            plugin.register_hooks?.(this.hooks_manager)
        })

        this.connect()

        // 监听网络状态
        this.watch_network_status()
    }

    /** 连接socket */
    connect = () => {
        if (this.is_connect) {
            return
        }

        this.hooks_manager.trigger_hook('before_connect')

        this.socket = new WebSocket(this.url)

        this.socket.onopen = (event) => {
            this.is_connect = true
            this.reconnect_enable = true
            this.reconnect_attempts = 0

            beautify_log.success('socket连接成功')

            this.hooks_manager.trigger_hook('after_connect')

            this.listeners.open.forEach(listener => listener(event))
            // 开启心跳
            this.hartbeat.enable && this.start_heartbeat()
        };

        this.socket.onmessage = (event) => {
            if (event.data === this.hartbeat.pong) {
                return
            }

            this.hooks_manager.trigger_hook('after_receive', event)

            const new_data = this.hooks_manager.trigger_hook('transform_receive', event.data)

            this.listeners.message.forEach(listener => listener(new_data))
        };

        this.socket.onclose = (event) => {
            this.is_connect = false

            this.hooks_manager.trigger_hook('on_close', event)

            this.listeners.close.forEach(listener => listener(event))

            if (event.code === 1006) {
                beautify_log.wanning('socket连接断开，尝试重新连接')
                this.stop_heartbeat()
                this.reconnect()
            } else {
                beautify_log.error('socket连接断开')
            }
        };

        this.socket.onerror = (error) => {
            beautify_log.error('socket连接出错')
            this.hooks_manager.trigger_hook('on_error', error)
            this.listeners.error.forEach(listener => listener(error))
            this.close()
        };
    }

    /** 重连socket */
    private reconnect = () => {
        if (!this.reconnect_enable) return
        if (this.reconnect_attempts < this.max_reconnect_attempts) {

            this.hooks_manager.trigger_hook('before_reconnect', {
                attempts: this.reconnect_attempts,
                max_attempts: this.max_reconnect_attempts,
                interval: this.reconnect_interval,
                url: this.url
            })

            this.reconnect_attempts++
            setTimeout(() => {
                beautify_log.wanning(`正在尝试重连socket，当前次数：${this.reconnect_attempts}`)
                this.connect()
            }, this.reconnect_interval)
        } else {
            beautify_log.error('socket已关闭；达到最大重连次数')
        }
    }

    /** 监听网络变换 */
    private watch_network_status = () => {
        const handle_offline = () => {
            this.is_connect = false;
            this.hooks_manager.trigger_hook('on_network_status', this.is_connect)
            this.listeners.network_status.forEach(listener => listener(this.is_connect))
        }
    
        const handle_online = () => {
            this.is_connect = true;
            this.hooks_manager.trigger_hook('on_network_status', this.is_connect)
            this.listeners.network_status.forEach(listener => listener(this.is_connect))
        }

        window.addEventListener('online', handle_online)
        window.addEventListener('offline', handle_offline)

        window.removeEventListener('online', handle_online)
        window.removeEventListener('offline', handle_offline)
    }

    /** 发送数据 */
    send = (data: unknown) => {
        
        this.hooks_manager.trigger_hook('before_send', data)
        
        if (this.is_connect) {
            
            data = this.hooks_manager.trigger_hook('transform_send', data)

            if (data instanceof ArrayBuffer || data instanceof Blob) {
                this.socket!.send(data)
                return
            }

            if (typeof data === 'object') {
                this.socket!.send(JSON.stringify(data))
                return
            }

            this.socket!.send(String(data))
        }
    }

    /** 监听状态 */
    add_listener = <T extends keyof TListeners, U extends TListeners[T][number]>(type: T, listener: U) => {
        if (!this.listeners[type]) return

        const new_listener = this.hooks_manager.trigger_hook('modify_listeners', listener);

        this.listeners[type].push(new_listener || listener)
    }

    /** 移除监听状态 */
    remove_listener = <T extends keyof TListeners, U extends TListeners[T][number]>(type: T, listener: U) => {
        if (this.listeners[type]) {
            // @ts-ignore
            this.listeners[type] = this.listeners[type].filter(l => l !== listener)
        }
    }

    /** 关闭socket */
    private close() {
        if (this.socket) {
            this.socket.close()
            this.socket = null
            this.is_connect = false
            this.stop_heartbeat()
        }
    }

    /** 销毁 */
    destroy() {
        this.reconnect_enable = false
        this.close()
        this.plugins.forEach(plugin => plugin.destroy(this, this.hooks_manager))
    }

    /** 开启心跳 */
    private start_heartbeat = () => {
        this.stop_heartbeat()
        this.heartbeat_timer = setTimeout(() => {
            this.send(this.hartbeat.ping)
            this.start_heartbeat()
        }, this.hartbeat.interval * 1000)
    }

    /** 关闭心跳 */
    private stop_heartbeat = () => {
        if (this.heartbeat_timer) {
            clearInterval(this.heartbeat_timer)
            this.heartbeat_timer = null
        }
    }

    /** 添加插件 */
    add_plugins = (...plugins: IWsPlugin[]) => {
        for (const plugin of plugins) {
            const esixt = this.plugins.some(p => p.name === plugin.name)
            if (esixt) continue
            this.plugins.push(plugin)
            plugin.init(this)
            plugin.register_hooks?.(this.hooks_manager)
        }
    }

    /** 移除插件 */
    remove_plugins = (...plugins: IWsPlugin[]) => {
        for (const plugin of plugins) {
            const index = this.plugins.indexOf(plugin)
            if (index !== -1) {
                this.plugins.splice(index, 1)
                plugin.destroy(this, this.hooks_manager)
            }
        }
    }
}