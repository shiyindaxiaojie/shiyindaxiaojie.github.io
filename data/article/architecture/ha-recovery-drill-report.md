---
title: Server High Availability Recovery Drill Report
date: 2023-06-26
description: Verify System A's RPO under 4 hours, RTO under 12 hours through chaos drill fault injection.
tags:
  - Chaos Engineering
  - ChaosBlade
  - Template Example
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/ChaosBlade.png
---

# Overview

## Background

According to "Server High Availability Recovery Drill Plan", verify high availability of CLB load-balanced multi-CVM deployment.

## Target Requirements

Verify System A's RPO under 4 hours, RTO under 12 hours through chaos drill fault injection.

## Personnel

- Drill Implementation: Person D
- Business Verification: Person E, Person F

## Test Target

System A prd1 production environment

## Operation Time

2023-06-25 15:00 ~ 18:00

# Records

## Linux Kernel Failure Recovery

### Fault Simulation

Inject Linux kernel fault on prd1 server. Console shows "Executing". After completion, SSH session auto-exits, indicating effective fault injection.

### Process Record

Kernel fault injection lasted 30 minutes:

- Continuous production access showed brief seconds of API errors
- After CLB detected prd1 port anomaly, production API access normal

SMS alert received indicating prd1 server anomaly.

After disabling fault injection, restarting prd1 server, SSH login succeeded but application process stopped and didn't auto-restart, requiring manual restart.

### Result Verification

1. First injection: brief API errors, CLB detected unavailable CVM in seconds, requests recovered - as expected
2. Alert triggered, server recovered, manual script execution to start process due to kernel fault, CLB switch back, requests normal - as expected

## CPU 100% Recovery

### Fault Simulation

Inject CPU stress test on prd1. SSH to server, `Top` shows 4 `stress-ng-cpu` processes (4-core server), CPU load reaching `5.90` `5.47` `3.28`.

### Process Record

CPU fault injection lasted 10 minutes. System still accessible since server only runs Nginx, backend services on K8s cluster.

### Result Verification

High CPU load has low impact on Nginx process.

## Memory 100% Recovery

### Fault Simulation

Inject memory stress test on prd1. SSH shows 1 `stress-ng-vm` process (8GB memory), memory growing causing process CPU at 100%.

### Process Record

System response delayed, API returns exceeded 10 seconds - users perceive system lag.

### Result Verification

At 100% memory usage, response time increases. CLB heartbeat detects anomaly, removes node from CLB, subsequent requests normal - as expected.

## Machine Restart Recovery

### Fault Simulation

Inject restart on prd1 server.

### Process Record

Fast system restart, no user-perceived API errors. However Nginx process not started, CLB can't detect node, subsequent requests fail. Starting Nginx restores CLB node.

### Result Verification

Machine restart has minimal business impact - as expected.

# Summary

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/cfg-cvm-report.png)
