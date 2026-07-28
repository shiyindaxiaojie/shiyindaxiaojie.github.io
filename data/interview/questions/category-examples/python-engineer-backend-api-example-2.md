---
id: python-engineer-backend-api-example-2
title: "一个慢接口里混着数据库和外部 API，先怎么拆时间？"
slug: python-engineer-backend-api-example-2
tracks:
  - python-engineer
category: backend-api
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "后端 API"
  - "参数校验"
  - "错误码"
  - "链路追踪"
summary: "围绕后端 API的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
一个慢接口里混着数据库和外部 API，先怎么拆时间？

::candidate level="deep"::
用 Trace 把总耗时拆成排队、数据库、远端和序列化，再看并行可能性与超时预算。先修最大段；把同步代码改成 async 不会自动让数据库或外部服务更快。

::interviewer::
这项后端 API设计怎么证明不是纸上方案？

::candidate level="deep"::
检查结构化日志、Trace、错误码分布、P99 和依赖耗时，契约测试覆盖成功与失败响应。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
统一异常处理中不能吞掉上下文，也不能把内部堆栈暴露给客户端。外部错误稳定、内部证据完整是两条边界。
