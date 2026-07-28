---
id: devops-networking-example-1
title: "服务偶发连接超时，怎么判断是 DNS、网络还是应用没接住？"
slug: devops-networking-example-1
tracks:
  - devops
category: networking
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "TCP"
  - "DNS"
  - "连接超时"
  - "抓包"
summary: "围绕TCP的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
服务偶发连接超时，怎么判断是 DNS、网络还是应用没接住？

::candidate level="core"::
先把“连接超时”拆开：域名解析、TCP 三次握手、TLS 握手、连接池等待和应用响应是五段不同时间。客户端埋点或 Trace 能先指出慢在哪一段，再用 dig、ss、网关日志和抓包逐层验证，不能一看到 timeout 就归因网络。

::interviewer::
别停在原理上，TCP落到线上先看什么证据？

::candidate level="deep"::
把客户端阶段耗时、DNS 响应、SYN 重传、服务端 accept 队列和应用日志放到同一时间轴，证据才能区分网络丢包与应用排队。

::interviewer::
TCP这套判断在哪个边界下会失效？

::candidate::
抓包位置会改变结论。NAT、负载均衡和 Service Mesh 都可能改写连接，客户端与服务端至少各取一个观测点，时钟也要校准。
