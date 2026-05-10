/**
 * WebSocket Telemetry Client
 * 
 * Manages WebSocket connection to Entropy Engine backend.
 * Provides real-time operational + business metrics, AI decisions, safety status.
 */

class TelemetryClient {
  constructor(baseUrl = "http://localhost:8001") {
    this.baseUrl = baseUrl;
    this.ws = null;
    this.listeners = new Set();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // 2 seconds
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.ws && this.isConnected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Convert http:// to ws:// or https:// to wss://
        const wsUrl = this.baseUrl
          .replace(/^http:/, "ws:")
          .replace(/^https:/, "wss:");

        console.log(`[Telemetry] Connecting to ${wsUrl}/ws/telemetry`);
        this.ws = new WebSocket(`${wsUrl}/ws/telemetry`);

        this.ws.onopen = () => {
          console.log("[Telemetry] ✓ Connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "telemetry" && message.payload) {
              this.notifyListeners(message.payload);
            }
          } catch (e) {
            console.error("[Telemetry] Failed to parse message:", e);
          }
        };

        this.ws.onerror = (error) => {
          console.error("[Telemetry] Error:", error);
          this.isConnected = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("[Telemetry] Disconnected");
          this.isConnected = false;
          this.attemptReconnect();
        };

        // Set timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error("Connection timeout"));
          }
        }, 5000);
      } catch (e) {
        console.error("[Telemetry] Failed to create WebSocket:", e);
        reject(e);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("[Telemetry] Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    console.log(
      `[Telemetry] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect().catch(() => {
        // Continue attempting
      });
    }, delay);
  }

  /**
   * Subscribe to telemetry updates
   * @param {(payload) => void} callback - Called with telemetry payload on each tick
   * @returns {() => void} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of new telemetry data
   */
  notifyListeners(payload) {
    this.listeners.forEach((callback) => {
      try {
        callback(payload);
      } catch (e) {
        console.error("[Telemetry] Listener error:", e);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Check if connected
   */
  getIsConnected() {
    return this.isConnected;
  }
}

// Create singleton instance
const telemetryClient = new TelemetryClient(
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8001"
);

export default telemetryClient;
