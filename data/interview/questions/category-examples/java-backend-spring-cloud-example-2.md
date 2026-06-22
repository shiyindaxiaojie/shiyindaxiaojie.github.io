---
id: java-backend-spring-cloud-example-2
title: 超时、重试、熔断为什么必须放在一条调用链里设计？
slug: java-backend-spring-cloud-example-2
tracks:
  - java-backend
category: spring-cloud
difficulty: senior
questionType: scenario
frequency: high
tags:
  - Spring Cloud
  - 服务注册发现
  - 熔断降级
  - 配置中心
summary: 用慢下游场景结合 trace、metrics、线程池和熔断状态设计超时、重试与降级。
estimatedRead: 5
---

::interviewer::
一个接口依赖三个下游服务，你会怎么设计超时和重试？

::candidate level="deep"::
我会从入口 SLA 倒推预算。比如接口最多 800ms，就不能给三个下游各配 1s 超时再重试两次。每段调用要有独立超时，重试只给幂等读请求或明确有幂等键的写请求，并且设置次数、退避和总耗时上限。否则一次慢调用会被重试放大成更多流量。

::interviewer::
线上出现大量超时，你怎么判断先调哪个参数？

::candidate::
我会先看 trace，把耗时拆成网关、服务处理、线程池排队、下游调用几段。指标上看 `/actuator/metrics/http.server.requests`、客户端调用耗时、线程池 active/queue、熔断器状态和重试次数。如果是下游过载，先限流或熔断；如果是本服务线程池被慢调用占满，先缩短超时和做线程池隔离；如果只是少量网络抖动，再考虑有限重试。

::interviewer::
为什么超时、重试、熔断不能分开看？

::candidate level="deep"::
因为它们会互相放大。超时太长会占住线程，重试会增加下游压力，熔断阈值太松会让慢调用拖垮上游，太紧又可能误伤。实操上我会把一次请求的最大耗时预算写清楚，再看重试后的最坏路径是否还在预算内，同时确认熔断打开时业务返回什么降级结果。

::interviewer::
怎么确认重试没有把故障放大？

::candidate::
看两组数据：一是客户端侧每个请求的实际尝试次数和总耗时，二是下游看到的 QPS 是否在故障时被放大。能埋点就记录 retry count，不能埋点至少从日志里按 traceId 看同一请求是否多次调用同一下游。如果下游已经 5xx 或超时率很高，还持续重试，就是在放大故障。

::interviewer::
熔断打开后，业务上怎么处理？

::candidate::
先分核心和非核心依赖。非核心信息可以返回缓存、默认值或隐藏模块；核心链路通常要快速失败，给用户明确提示，并保留补偿入口。降级不是后端自己随便返回假数据，要和产品约定语义。技术上还要监控熔断打开次数、半开探测结果和恢复时间，避免熔断后没人知道。
