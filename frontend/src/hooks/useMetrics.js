import { useState, useEffect, useRef, useCallback } from "react";
import { fetchState, fetchHistory, fetchComparison } from "../services/api";
import telemetryClient from "../services/telemetry"; // ── NEW: WebSocket client ──

/* ────────────────────────────────────────────
   useMetrics — consumes WebSocket telemetry
   with fallback to REST polling
   ──────────────────────────────────────────── */
export function useMetrics(intervalMs = 1000) {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const unsubscribeRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  useEffect(() => {
    let active = true;
    let useWebSocket = true;

    // Try to connect to WebSocket
    const setupTelemetry = async () => {
      try {
        await telemetryClient.connect();
        if (!active) return;

        setConnected(true);
        useWebSocket = true;

        // Subscribe to telemetry updates
        unsubscribeRef.current = telemetryClient.subscribe((payload) => {
          if (active) {
            setState({
              metrics: payload.metrics || {},
              business: payload.business || {},
              ai_decision: payload.ai?.decision || {},
              ai_mode: payload.ai?.mode === "on",
              safety_level: payload.safety?.safety_level || "NORMAL",
              confidence: payload.ai?.confidence || {},
              tick_count: payload.tick_count,
            });
          }
        });
      } catch (error) {
        console.warn("[useMetrics] WebSocket failed, falling back to REST polling", error);
        useWebSocket = false;
        setConnected(false);
        setupRESTPolling();
      }
    };

    // Fallback to REST polling
    const setupRESTPolling = () => {
      const poll = async () => {
        try {
          const data = await fetchState();
          if (active) {
            setState(data);
            setConnected(true);
          }
        } catch {
          if (active) setConnected(false);
        }
      };

      poll();
      fallbackTimerRef.current = setInterval(poll, intervalMs);
    };

    setupTelemetry();

    // Cleanup
    return () => {
      active = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
      }
    };
  }, [intervalMs]);

  return { state, connected };
}

/* ────────────────────────────────────────────
   useHistory — polls /api/history
   ──────────────────────────────────────────── */
export function useHistory(intervalMs = 2000, limit = 120) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const data = await fetchHistory(limit);
        if (active) setHistory(data);
      } catch { /* skip */ }
    };
    poll();
    const id = setInterval(poll, intervalMs);
    return () => { active = false; clearInterval(id); };
  }, [intervalMs, limit]);

  return history;
}

/* ────────────────────────────────────────────
   useComparison — polls /api/comparison
   ──────────────────────────────────────────── */
export function useComparison(intervalMs = 3000) {
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const data = await fetchComparison();
        if (active) setComparison(data);
      } catch { /* skip */ }
    };
    poll();
    const id = setInterval(poll, intervalMs);
    return () => { active = false; clearInterval(id); };
  }, [intervalMs]);

  return comparison;
}
