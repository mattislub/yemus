declare module 'crypto' {
  export function randomUUID(): string;
}

declare module 'http' {
  import { EventEmitter } from 'events';

  export interface IncomingMessage extends EventEmitter {
    url?: string | null;
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    on(event: 'data', listener: (chunk: Buffer | string) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
  }

  export interface ServerResponse extends EventEmitter {
    statusCode: number;
    setHeader(name: string, value: string | string[]): void;
    end(data?: unknown): void;
  }
}

declare module 'events' {
  class EventEmitter {
    on(event: string | symbol, listener: (...args: unknown[]) => void): this;
    emit(event: string | symbol, ...args: unknown[]): boolean;
  }

  export { EventEmitter };
}
