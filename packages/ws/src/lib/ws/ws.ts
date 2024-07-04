import { beautify_log } from "@/utils"

type TListenerFn<T = any> = (event: T) => void

type TListeners = {
    message: TListenerFn<MessageEvent<any>>[]
    open: TListenerFn<Event>[]
    close: TListenerFn<CloseEvent>[]
    error: TListenerFn<Event>[]
}

type TWsOptions = {
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
    destroy(): void
    modify_send_data?(data: unknown): unknown
    modify_receive_data?(data: unknown): unknown
    modify_listener_args?(type: string, listener: TListenerFn): TListenerFn
    send_data?(data: unknown): void
}

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
            error: []
        }
        this.plugins = options.plugins || []

        this.plugins.forEach(plugin => plugin.init(this))

        this.connect()
    }

    /** 连接socket */
    connect = () => {
        if (this.is_connect) {
            return
        }

        this.socket = new WebSocket(this.url)

        this.socket.onopen = (event) => {
            this.is_connect = true
            this.reconnect_enable = true
            this.reconnect_attempts = 0

            beautify_log.success('socket连接成功')

            this.listeners.open.forEach(listener => listener(event))
            // 开启心跳
            this.hartbeat.enable && this.start_heartbeat()
        };

        this.socket.onmessage = (event) => {
            if (event.data === this.hartbeat.pong) {
                return
            }

            const new_event = { ...event }

            this.plugins.forEach(plugin => {
                if (plugin.modify_receive_data) {
                    new_event.data = plugin.modify_receive_data(event.data);
                }
            })

            this.listeners.message.forEach(listener => listener(new_event))
        };

        this.socket.onclose = (event) => {
            this.is_connect = false
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
            this.listeners.error.forEach(listener => listener(error))
            this.close()
        };
    }

    /** 重连socket */
    private reconnect = () => {
        if (!this.reconnect_enable) return
        if (this.reconnect_attempts < this.max_reconnect_attempts) {
            this.reconnect_attempts++
            setTimeout(() => {
                beautify_log.wanning(`正在尝试重连socket，当前次数：${this.reconnect_attempts}`)
                this.connect()
            }, this.reconnect_interval)
        } else {
            beautify_log.error('socket已关闭；达到最大重连次数')
        }
    }

    /** 发送数据 */
    send = (data: unknown) => {
        this.plugins.forEach(plugin => plugin.send_data?.(data))

        if (this.is_connect) {
            this.plugins.forEach(plugin => {
                if (plugin.modify_send_data) {
                    data = plugin.modify_send_data(data);
                }
            });

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

        this.plugins.forEach(plugin => {
            if (plugin.modify_listener_args) {
                listener = plugin.modify_listener_args(type, listener) as U;
            }
        });

        // @ts-ignore
        this.listeners[type].push(listener)
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
        this.plugins.forEach(plugin => plugin.destroy())
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
        }
    }

    /** 移除插件 */
    remove_plugins = (...plugins: IWsPlugin[]) => {
        for (const plugin of plugins) {
            const index = this.plugins.indexOf(plugin)
            if (index !== -1) {
                this.plugins.splice(index, 1)
                plugin.destroy()
            }
        }
    }
}