/**
 * Controllable WebSocket double for unit tests. Mirrors the bits of the WHATWG
 * WebSocket the realtime client uses (readyState, OPEN/CONNECTING statics,
 * on{open,message,close,error}, send, close) plus test-only drivers.
 */
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  /** Every socket the client constructs, in order. */
  static instances: MockWebSocket[] = [];
  static reset() {
    MockWebSocket.instances = [];
  }
  static get last(): MockWebSocket | undefined {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }

  url: string;
  readyState = MockWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: ((ev: { code: number; reason?: string }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  /** The client calling .close() — emulate the browser firing onclose(1000). */
  close(code = 1000, reason = "") {
    if (this.readyState === MockWebSocket.CLOSED) return;
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }

  // ---- test drivers ----
  serverOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }
  serverMessage(data: unknown) {
    this.onmessage?.({ data: typeof data === "string" ? data : JSON.stringify(data) });
  }
  /** Server/network closes the socket with a code (e.g. 4401 or a drop). */
  serverClose(code: number) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code });
  }
}
