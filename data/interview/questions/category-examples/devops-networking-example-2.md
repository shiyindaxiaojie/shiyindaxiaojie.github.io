---
id: devops-networking-example-2
title: "TCP 建连突然变慢，抓包时重点看哪几个时间点？"
slug: devops-networking-example-2
tracks:
  - devops
category: networking
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "TCP"
  - "DNS"
  - "连接超时"
  - "抓包"
summary: "围绕TCP的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
TCP 建连突然变慢，抓包时重点看哪几个时间点？

::candidate level="deep"::
抓包先看 SYN 到 SYN-ACK 的间隔、是否重传、握手完成后客户端多久发出数据。SYN 重传偏向链路、防火墙或服务端 backlog；握手快但首包迟，问题更可能在连接池、TLS 或应用线程。

::interviewer::
如果现场现象和预期不一致，TCP怎么继续缩小范围？

::candidate level="deep"::
把客户端阶段耗时、DNS 响应、SYN 重传、服务端 accept 队列和应用日志放到同一时间轴，证据才能区分网络丢包与应用排队。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
抓包位置会改变结论。NAT、负载均衡和 Service Mesh 都可能改写连接，客户端与服务端至少各取一个观测点，时钟也要校准。
