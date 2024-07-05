# @ohfuck/iwebsocket

## 简介
本文档详细介绍了对WebSocket的封装，包括插件系统和Hooks机制的使用。封装的目的是提供一种更加灵活、功能丰富的WebSocket通信方式，以适应不同的业务场景。

## 快速开始
    
### 安装
```bash
bun add @ohfuck/iwebsocket
```

### 导入
```typescript
import { IWebSocket } from '@ohfuck/iwebsocket';
```

### 创建WebSocket实例
```typescript
const ws = new IWebSocket('ws://your-websocket-url', {
    reconnect_interval: 3000, // 重连间隔时间，默认3000ms
    max_reconnect_attempts: Infinity, // 最大重连次数，默认无限
    heartbeat: { // 心跳配置
        enable: true, // 是否启用心跳检测
        interval: 30, // 心跳间隔时间，单位秒
        ping: 'ping', // 心跳发送的消息
        pong: 'pong'  // 期望接收的心跳响应消息
    },
    plugins: [] // 可以在这里注册插件
});
```

### 注册事件监听器
```typescript
ws.add_listener('open', (event) => {
    console.log('WebSocket 连接成功');
});

ws.add_listener('message', (event) => {
    console.log('收到消息：', event.data);
});

ws.add_listener('close', (event) => {
    console.log('WebSocket 连接关闭，代码：', event.code, '原因：', event.reason);
});

ws.add_listener('error', (event) => {
    console.error('WebSocket 连接出错：', event);
});
```

## 重连机制
封装自动处理WebSocket的重连机制，根据`reconnect_interval`和`max_reconnect_attempts`配置进行重连尝试。

## 心跳机制
封装自动处理心跳机制，根据heartbeat配置发送和接收心跳消息，以确保连接的活跃性。

## 插件系统
插件系统允许用户通过实现IWsPlugin接口来扩展WebSocket的功能。

### 插件接口IWsPlugin
```typescript
export interface IWsPlugin {
    // 插件名称
    name: string;
    // 插件初始化
    init(ws: IWebSocket): void; 
    // 插件销毁
    destroy(ws: IWebSocket, hooks_manager: WsHooksManager): void; 
    // 注册插件的hooks
    register_hooks?: (hooks_manager: WsHooksManager) => void; 
}
```

### 使用插件
在创建WebSocket实例时，通过plugins选项注册插件。
```typescript
// 方式1：创建实例时注册插件
const ws = new IWebSocket('ws://your-websocket-url', {
    plugins: [
        new MyCustomPlugin({ /* 插件配置 */ })
    ]
});

// 方式2：创建实例后注册插件
const p1 = new MyCustomPlugin1({ /* 插件配置 */ }),
      p2 = new MyCustomPlugin2({ /* 插件配置 */ }),
      p3 = new MyCustomPlugin2({ /* 插件配置 */ });

ws.add_plugins(p1, p2, p3);

// 移除插件
ws.remove_plugins(p2, p3);
```

### 插件开发
插件开发需要实现IWsPlugin接口，流程如下：

- 实现IWsPlugin接口。
- 在init方法中初始化插件，注册事件监听器或执行其他初始化操作。
- 在destroy方法中清理插件资源，如移除事件监听器。
- 使用register_hooks方法注册插件的hooks。

## Hooks机制
Hooks机制允许用户在WebSocket的关键生命周期事件中插入自定义逻辑。

可用的Hooks：
- before_connect: 连接前触发。
- after_connect: 连接成功后触发。
- before_send: 发送数据前触发。
- after_receive: 接收数据后触发。
- before_reconnect: 重连前触发。
- on_close: 连接关闭后触发。
- on_error: 出现错误时触发。
- transform_send: 转换要发送的数据。
- transform_receive: 转换接收到的数据。
- modify_listeners: 修改事件监听器。

### 使用Hooks
hooks方法只能在插件中使用，在插件的register_hooks方法中注册。
```typescript
export class MyCustomPlugin implements IWsPlugin {
    name = 'MyCustomPlugin'
    
    init(ws: IWebSocket) {}

    destroy(ws: IWebSocket, hooks_manager: WsHooksManager) {}

    register_hooks(hooks_manager: WsHooksManager) {
        hooks_manager.register_hook('before_connect', () => {})
        hooks_manager.register_hook('after_connect', () => {})
        hooks_manager.register_hook('before_send', () => {})
        hooks_manager.register_hook('after_receive', () => {})
        hooks_manager.register_hook('before_reconnect', () => {})
        hooks_manager.register_hook('on_close', () => {})
        hooks_manager.register_hook('on_error', () => {})
        hooks_manager.register_hook('transform_send', () => {})
        hooks_manager.register_hook('transform_receive', () => {})
        hooks_manager.register_hook('modify_listeners', () => {})

        // 可以接收返回值，返回值的作用是：移除该事件监听器
        const remove_listener = hooks_manager.register_hook('xxxx', () => {})
        remove_listener?.()
    }
}
```

## 内置插件
我们内置了2个插件：

1. `StashMsgPlugin`：用于暂存消息，当WebSocket连接中断时，可自动将要发送的消息暂存，待连接恢复后再发送。
2. `NetworkPlugin`：用于监控网络状态，当监控到网络连接中断时，第一时间将socket实例状态更改为`未连接`状态，随后socket实例会触发重连

## 示例
```typescript
import { IWebSocket, NetworkPlugin, StashMsgPlugin } from "@ohfuck/iwebsocket";

const ws = new IWebSocket("http://localhost:10002", {
    hartbeat: {
        enable: true,
        interval: 5
    },
    plugins: [
        new StashMsgPlugin({ 
            // 可选，用于设置暂存消息的最大数量，默认500
            max_msgs: 500,
            // 可选，是否持久化暂存离线消息，默认false=>仅在内存中缓存，true=>持久化到本地localStorage
            persist_offline_msgs: true, 
            // 可选，是否展示日志，默认false
            log: true 
        }),
        new NetworkPlugin({ 
            // 可选，是否展示日志，默认false
            log: true 
        })
    ]
})
```

## 二次开发

### 拉取代码
```bash
git clone https://github.com/839900146/fuck-websocket.git
```

### 安装依赖
```bash
bun install
```

### 启动前端
```bash
npm run start -w @ohfuck/iwebsocket
```

### 启动后端
```bash
npm run start:ws -w backend
```

### 编译代码
```bash
npm run build -w @ohfuck/iwebsocket
```