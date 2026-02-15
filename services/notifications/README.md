# CrestDesk Notifications Service

The Notifications service manages all outbound communication and in-app notification delivery within CrestDesk. It handles email dispatch, SMS messaging, push notifications, real-time WebSocket alerts, and notification preference management. This service processes event-driven triggers from other services via BullMQ job queues, applies user preference filters, and ensures reliable delivery across all configured channels.
