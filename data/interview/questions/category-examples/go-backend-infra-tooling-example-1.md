---
id: go-backend-infra-tooling-example-1
title: "用 Go 写基础设施工具时，怎么避免一次命令误改全网？"
slug: go-backend-infra-tooling-example-1
tracks:
  - go-backend
category: infra-tooling
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "基础设施工具"
  - "变更预览"
  - "批量变更"
  - "可恢复执行"
summary: "围绕基础设施工具的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
用 Go 写基础设施工具时，怎么避免一次命令误改全网？

::candidate level="core"::
默认只读和 dry-run，危险操作显式选择环境、资源与批次，再加权限、确认、并发上限和审计。输入先解析成变更计划，计划经校验后执行，避免边遍历边修改导致范围不可预测。

::interviewer::
这条基础设施工具链路上线后，用什么证据验证设计？

::candidate level="deep"::
用变更计划、审计日志、资源前后快照和失败注入测试证明工具边界；必须能按一次 run_id 还原全过程。

::interviewer::
基础设施工具里最容易漏掉的失败分支是什么？

::candidate::
并发加速会触发 API 限额和共享资源竞争。worker 数、速率限制与重试应由目标系统容量决定，不由本地 CPU 决定。
