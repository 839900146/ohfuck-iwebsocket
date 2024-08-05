import type { IWebSocket } from "@/lib/ws/ws";

export type TWsHooks = {
    /** 建立连接前 */
    before_connect: () => void,
    /** 建立连接后 */
    after_connect: () => void,
    /** 发送数据前 */
    before_send: (data: unknown) => void,
    /** 接收数据后 */
    after_receive: (event: MessageEvent) => void,
    /** 重连前 */
    before_reconnect: (...args: any[]) => void,
    /** 关闭连接后 */
    on_close: (event: CloseEvent) => void,
    /** 发生错误后 */
    on_error: (error: Event) => void,
    /** 网络状态变化 */
    on_network_status: (data: boolean) => void,
    /** 转换要发送的数据 */
    transform_send: (data: unknown) => unknown,
    /** 转换接收到的数据 */
    transform_receive: (data: unknown) => unknown,
    /** 修改监视器 */
    modify_listeners: <T extends ((...args: any[]) => any)>(listeners: T) => T,
};

export type TWsTriggerHooks = {
    [K in keyof TWsHooks]: (ws: IWebSocket, ...args: Parameters<TWsHooks[K]>) => ReturnType<TWsHooks[K]>
}

// 提取返回值类型
export type TWsHooksReturn<K extends keyof TWsHooks> = ReturnType<TWsHooks[K]>;