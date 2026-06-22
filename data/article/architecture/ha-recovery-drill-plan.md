---
title: Server High Availability Recovery Drill Plan
date: 2023-06-25
description: Due to historical reasons, System A has projects using CVM as runtime environment.
tags:
  - chaos-engineering
  - chaosblade
  - high-availability
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/ChaosBlade.png
---

# Overview

## Drill Purpose

Due to historical reasons, System A has projects using CVM as runtime environment. Despite Tencent Cloud's 99.975% single instance SLA, Linux kernel failures, high CPU/memory usage can still cause system unavailability. To prevent business interruption, use Tencent Cloud CLB for load balancing across 3+ CVM instances for high availability.

## Target Requirements

Verify System A's deployment architecture has self-healing capability through chaos drill fault injection, with acceptable business impact. Meet financial industry IT disaster recovery standards, achieving National Standard Level 4+: RPO under 4 hours, RTO under 12 hours.

## Terminology

| Term | Description                                                          |
| ---- | -------------------------------------------------------------------- |
| RPO  | Recovery Point Objective - data recovery time point after disaster   |
| RTO  | Recovery Time Objective - time from system down to business restored |
| CVM  | Cloud Virtual Machine - Tencent Cloud's scalable computing service   |
| CLB  | Cloud Load Balancer - traffic distribution across backend servers    |
| CFG  | Chaotic Fault Generator - fault drill service                        |

# Plan

## System Analysis

Drill target: System A production environment. CLB health check: 2s response timeout, 5s interval, 3 unhealthy/healthy thresholds. 21+ seconds to detect unhealthy CVM.

CLB binds 5 nodes (8 core 16GB each):

- gray: 172.28.0.1
- prd1-4: 172.28.0.2-5

Plan to use **prd1** as test target.

## Implementation Time

June 25, 2023 (non-trading day, low traffic)

## Drill Content

### Linux Kernel Failure Recovery

Fault simulation: prd1 node kernel failure

Steps:

1. Inject `Linux kernel fault` on prd1
2. SSH to CVM, run `Top` to verify `chaos_burnkernel` process
3. Inject fault for 1 min without CLB switch, observe system
4. Re-inject fault, when alert received, manually switch CLB

Expected results:

1. First injection: CLB detects unavailable CVM in 21s, requests recover
2. Second injection: alert triggers, manual CLB switch, RTO acceptable

### CPU 100% Recovery

Fault simulation: prd1 node CPU utilization reaches 100%

### Memory 100% Recovery

Fault simulation: prd1 node memory utilization reaches 100%

### Machine Restart Recovery

Fault simulation: prd1 node crash restart

## Site Restoration

During fault injection, processes like `chaos_burncpu`, `chaos_burnmem` are created. After drill, manually check and terminate residual processes if platform cleanup fails.

## Data Verification

No data writes during drill, no data verification needed.
