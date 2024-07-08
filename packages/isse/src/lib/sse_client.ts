type TOptions = {
    url: string
}

type TListener<T = any> = (msg: T) => void

export class SseClient {
    private sse: EventSource | null = null;
    private options: TOptions;
    private listeners: Map<string, TListener[]>;
    __client_key__: string | undefined;

    constructor(options: TOptions) {
        this.options = options
        this.listeners = new Map()
        this.connect()
    }

    get is_open() {
        return this.sse?.readyState === EventSource.OPEN
    }

    get is_closed() {
        return this.sse?.readyState === EventSource.CLOSED
    }

    connect = () => {
        if (this.is_open) return
        this.sse = new EventSource(this.options.url)
        this.sse.addEventListener('open', this.open)
        this.sse.addEventListener('message', this.message)
        this.sse.addEventListener('error', this.error)
    }

    private message = (event: MessageEvent) => {
        let type = event.type
        let data = SseClient.parse_event_data(event.data)
        if (type === 'connected' && data) {
            this.__client_key__ = data
            console.log(`%c%s %c%s`, 'background: #31E6B9;border:1px solid #31E6B9;padding: 0 2px;color:#fff', 'SSE connected with client_id', 'color: #31E6B9;border:1px solid #31E6B9;padding: 0 4px;', data)
        }
        this.invoke_listener(type, data)
    }

    private invoke_listener = (event: string, data: any) => {
        const listeners = this.listeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                listener(data);
            }
        }
    }

    private error = (event: Event) => {
        console.error('SSE error', event)
    }

    private open = () => {
        this.rebind_event()
    }

    close = () => {
        this.sse?.close()
        this.listeners.clear()
        this.__client_key__ = undefined
    }

    private rebind_event = (events: string[] = []) => {
        let old_events = this.listeners.keys()
        let new_events = [...new Set(events), ...old_events]
        for (const event of old_events) {
            this.sse?.removeEventListener(event, this.message)
        }
        for (const event of new_events) {
            this.sse?.addEventListener(event, this.message)
        }
    }

    add_listener = <T = any>(event: string, listener: TListener<T>) => {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, [])
        }
        this.listeners.get(event)?.push(listener)
        this.rebind_event()
        return () => {
            this.remove_listener(event, listener)
        }
    }

    private remove_listener = (event: string, listener: TListener) => {
        if (!this.is_open || !this.listeners.has(event)) {
            throw new Error('SSE is not open or listener not found')
        }

        const index = (this.listeners.get(event) || []).indexOf(listener)

        if (index > -1) {
            this.sse?.removeEventListener(event, this.message)
            this.listeners.get(event)?.splice(index, 1)
        }
    }

    private static parse_event_data = (data: string) => {
        try {
            return JSON.parse(data)
        } catch (error) {
            return data
        }
    }
}