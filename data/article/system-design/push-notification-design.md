---
title: Push Notification System Design
date: 2023-08-25
description: Design a push notification system that supports iOS, Android, and SMS delivery.
tags:
  - System Design
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/system-design/app-push.png
---

# Scenario

Design a push notification system that supports iOS, Android, and SMS delivery.

Requirements:
1. Support multiple delivery channels: iOS Push, Android Push, SMS, Email.
2. Soft real-time: users should receive notifications quickly, but small delays are acceptable.
3. Support 10 million daily active users (DAU).
4. Users can opt out / unsubscribe.

# Estimation

Assume each user receives 10 push notifications per day.

- Daily volume: 10,000,000 × 10 = 100,000,000/day
- QPS: 100,000,000 / 86400 ≈ 1,157/s
- Peak QPS: ~2,300/s

# Design

## Overall architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Service   │────▶│  Message    │────▶│  Push Workers   │
│   Trigger   │     │  Queue      │     │  (iOS/Android)  │
└─────────────┘     └─────────────┘     └─────────────────┘
                                                  │
                                                  ▼
                     ┌─────────────┐     ┌─────────────────┐
                     │   Device    │◀────│   APNs/FCM/     │
                     │   Storage   │     │   SMS Gateway   │
                     └─────────────┘     └─────────────────┘
```

## Core components

### 1. Push service entry
- Receive push requests from upstream services
- Validate parameters, rate limit, authenticate/authorize
- Write messages into the message queue

### 2. Device storage
- Store device tokens (APNs token, FCM token)
- Store user notification preferences
- Recommended: Redis + MySQL

### 3. Message queue
- Decouple request ingestion and actual delivery
- Buffer bursts (peak shaving)
- Recommended: Kafka or RocketMQ

### 4. Push workers
- Consume push jobs from the queue
- Route to the correct channel based on device type
- Handle delivery result, persist failures and retry

### 5. Third-party gateways
- **iOS**: APNs (Apple Push Notification service)
- **Android**: FCM (Firebase Cloud Messaging)
- **SMS**: Aliyun SMS, Tencent Cloud SMS, etc.

## Key design considerations

### Reliability
1. **Durability**: persist messages before sending
2. **Retry**: exponential backoff retry strategy
3. **DLQ**: move messages to a dead-letter queue after repeated failures

### Deduplication
1. Idempotency check by message ID
2. Deduplicate identical content within a short time window
3. Per-user rate limiting

### User preferences
1. Allow users to unsubscribe from certain notification types
2. Support do-not-disturb time windows
3. Frequency limits

# Summary

| Component | Choice |
|------|----------|
| Message queue | Kafka / RocketMQ |
| Device storage | Redis + MySQL |
| iOS delivery | APNs |
| Android delivery | FCM |
| SMS delivery | Aliyun / Tencent Cloud |

Key challenges:
1. **High availability**: fallback strategies when gateways fail
2. **Latency**: controlling end-to-end delay
3. **Observability**: delivery success rate and arrival rate monitoring