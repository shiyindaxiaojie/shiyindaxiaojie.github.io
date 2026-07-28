---
id: go-backend-infra-tooling-example-2
title: "CLI 执行到一半失败，如何做到可恢复而不是只能重跑？"
slug: go-backend-infra-tooling-example-2
tracks:
  - go-backend
category: infra-tooling
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "基础设施工具"
  - "变更预览"
  - "批量变更"
  - "可恢复执行"
summary: "围绕基础设施工具的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
CLI 执行到一半失败，如何做到可恢复而不是只能重跑？

::candidate level="deep"::
把每个资源的期望动作、幂等键和结果持久化，重启后从未完成项继续。已成功项不重复副作用，失败项保留错误与重试次数；不可逆步骤前设置人工检查点。

::interviewer::
这项基础设施工具设计怎么证明不是纸上方案？

::candidate level="deep"::
用变更计划、审计日志、资源前后快照和失败注入测试证明工具边界；必须能按一次 run_id 还原全过程。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
并发加速会触发 API 限额和共享资源竞争。worker 数、速率限制与重试应由目标系统容量决定，不由本地 CPU 决定。
