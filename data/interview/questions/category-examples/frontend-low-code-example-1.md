---
id: frontend-low-code-example-1
title: "低代码平台的 schema 怎么设计，才不会每加组件就破坏旧页面？"
slug: frontend-low-code-example-1
tracks:
  - frontend
category: low-code
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "低代码"
  - "Schema 版本"
  - "页面运行时"
  - "扩展安全"
summary: "围绕低代码的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
低代码平台的 schema 怎么设计，才不会每加组件就破坏旧页面？

::candidate level="core"::
schema 要有版本、稳定标识、默认值和显式迁移函数，组件配置与运行时实现解耦。旧页面加载时按版本逐步迁移并保留回滚，不能让新组件代码直接猜历史字段。

::interviewer::
这条低代码链路上线后，用什么证据验证设计？

::candidate level="deep"::
用 schema 兼容测试、历史页面回放、运行时 Performance trace 和错误率验证；每次迁移记录版本与失败样本。

::interviewer::
低代码里最容易漏掉的失败分支是什么？

::candidate::
表达能力越强，安全与性能越难控制。自定义脚本、外部请求和组件扩展必须沙箱化并分权限开放。
