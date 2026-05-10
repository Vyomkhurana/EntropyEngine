"""
Entropy Engine — WebSocket Telemetry Manager
==============================================
Manages real-time WebSocket connections for live telemetry streaming.

Broadcasts operational and business metrics every tick to all connected clients.
Enables low-latency, high-frequency updates without REST polling overhead.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Set
from contextlib import asynccontextmanager

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("entropy-engine")


class WebSocketManager:
    """Manages WebSocket connections and broadcasts telemetry."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._broadcast_queue: asyncio.Queue = asyncio.Queue()
        self._running: bool = False

    async def connect(self, websocket: WebSocket) -> None:
        """Register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"🔌 WebSocket connected | {len(self.active_connections)} clients active")
        
        # Send welcome message
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "message": "Welcome to Entropy Engine telemetry stream"
        })

    async def disconnect(self, websocket: WebSocket) -> None:
        """Unregister a WebSocket connection."""
        self.active_connections.discard(websocket)
        logger.info(f"🔌 WebSocket disconnected | {len(self.active_connections)} clients active")

    async def broadcast(self, data: dict) -> None:
        """
        Broadcast telemetry to all connected clients.
        
        Args:
            data: Dictionary containing telemetry payload (metrics, business, AI, safety)
        """
        if not self.active_connections:
            return  # No clients connected

        message = json.dumps({
            "type": "telemetry",
            "payload": data
        })

        # Send to all connected clients
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}")
                disconnected.add(connection)

        # Clean up disconnected clients
        for connection in disconnected:
            await self.disconnect(connection)

    async def handle_connection(self, websocket: WebSocket) -> None:
        """
        Handle a WebSocket connection.
        Listens for client messages and keeps connection alive.
        """
        await self.connect(websocket)
        try:
            while True:
                # Keep connection alive, listen for any messages from client
                data = await websocket.receive_text()
                # Optionally handle client messages (e.g., subscription preferences)
                # For now, just keep the connection alive
                if data:
                    logger.debug(f"Client message: {data}")
        except WebSocketDisconnect:
            await self.disconnect(websocket)
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
            await self.disconnect(websocket)

    def get_client_count(self) -> int:
        """Return number of currently connected clients."""
        return len(self.active_connections)

    async def broadcast_telemetry_payload(
        self,
        metrics: dict,
        business: dict,
        ai_decision: dict,
        safety: dict,
        ai_mode: bool,
        confidence: dict,
        tick_count: int,
    ) -> None:
        """
        Broadcast a complete telemetry payload to all clients.
        
        This is called once per orchestrator tick (1Hz).
        """
        payload = {
            "metrics": metrics or {},
            "business": business or {},
            "ai": {
                "decision": ai_decision or {},
                "mode": "on" if ai_mode else "off",
                "confidence": confidence or {},
            },
            "safety": safety or {},
            "tick_count": tick_count,
        }

        await self.broadcast(payload)


# Global instance
ws_manager = WebSocketManager()
