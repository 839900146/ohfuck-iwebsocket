# @ohfuck/isse

## 介绍
    
Server-Sent Events (SSE) 是一种基于 HTTP 协议的轻量级的、可靠的、基于事件的通信协议。它允许服务器向客户端推送数据，而无需客户端发起请求。

本库提供了 SSE 协议的实现，可以方便地与其他 HTTP 服务器进行通信。可在以下环境中运行：

- Bun
- Node
- express
- 浏览器

## 安装
```bash
npm install @ohfuck/isse # or bun add @ohfuck/isse
```

## 使用
本库包含以下子包，根据情况按需从`ohfuck/isse`导入：
- `SseClient`：SSE 客户端，用于向服务器发送请求并接收数据
- `SseBunServer`：Bun 服务器端，用于处理 SSE 请求并向客户端推送数据
- `SseNodeServer`：Node 服务器端，用于处理 SSE 请求并向客户端推送数据
- `SseExpressServer`：express 服务器端，用于处理 SSE 请求并向客户端推送数据

### SseClient
客户端，在前端中使用，向服务器发送 SSE 请求并接收数据。使用方式如下：
```typescript
import { SseClient } from "@ohfuck/isse";

const sse_client = new SseClient({
    url: "http://localhost:8080/sse",
})

// 连接成功后，服务端会固定传回一个connected消息，表示连接成功，msg为客户端id
sse_client.add_listener("connected", (msg) => {
    console.log('sse connected', msg)
})

// 可监听自定义事件，接收到demo1消息时，打印消息内容
sse_client.add_listener("demo1", (msg) => {
    console.log('this is demo1', msg)
})

// 可定义msg的类型，也可以通过返回值进行取消订阅
let unsubscripe = sse_client.add_listener<string>('demo2', (msg) => {
    console.log('this is demo2, the msg type is string', msg)
    unsubscripe()
})
```

### SseBunServer
Bun 服务器端，用于处理 SSE 请求并向客户端推送数据。使用方式如下：
```typescript
import { SseBunServer } from "@ohfuck/isse";

const app = new SseNodeServer({
    port: 8080,
    prefix: '/sse'
})
```


### SseNodeServer
Node 服务器端，用于处理 SSE 请求并向客户端推送数据。使用方式如下：
```typescript
import { SseNodeServer } from "@ohfuck/isse";

const app = new SseNodeServer({
    port: 8080,
    prefix: '/sse'
})
```

### SseExpressServer
express 服务器端，用于处理 SSE 请求并向客户端推送数据。使用方式如下：
```typescript
import { SseExpressServer } from "@ohfuck/isse";
import express from "express";
    
const app = express()

app.use(new SseExpressServer({
    prefix: '/sse'
}).start)

app.get('/abc', (req, res) => {
    req['__sse__'].broadcast('connected', 'abc')
    res.send('abc')
})

app.listen(8080, () => {
    console.log('SSE server started at http://localhost:8080/sse')
})
```

**请注意：**
关于在ts中`req['__sse__']`的类型提示问题，可创建一个类型声明文件(`xxx.d.ts`)，并写入以下内容即可：
```typescript
import "@ohfuck/isse/dist/types/types/express"
```

### 实例方法
- `broadcast(type: string, data: any)`：向所有连接的客户端广播消息
- `notify(client_id: string, type: string, msg: any)`：向指定客户端发送消息
>关于`type`字段：自定义事件类型，可以自定义，建议使用英文单词，同时避免与系统事件类型冲突。

```typescript
// 向所有客户端广播一条类型为'connected'的消息
sse_client.broadcast('connected', 'this is a message')

// 向指定客户端发送一条类型为'demo1'的消息
sse_client.notify('client_id', 'demo1', 'this is a message')
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
npm run start -w @ohfuck/isse
```

### 启动后端
请根据上面所说的文档，自行创建一个服务器进行测试

### 编译代码
```bash
npm run build -w @ohfuck/isse
```