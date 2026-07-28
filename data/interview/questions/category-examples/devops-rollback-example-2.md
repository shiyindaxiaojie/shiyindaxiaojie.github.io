---
id: devops-rollback-example-2
title: "线上故障时应该回滚还是向前修复，用什么条件判断？"
slug: devops-rollback-example-2
tracks:
  - devops
category: rollback
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "回滚止血"
  - "数据库兼容"
  - "灰度发布"
  - "向前修复"
summary: "围绕回滚止血的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
线上故障时应该回滚还是向前修复，用什么条件判断？

::candidate level="deep"::
看恢复速度和风险，而不是习惯。旧制品和配置已验证、数据仍兼容时优先回滚；变更不可逆或旧版本同样受影响时向前修复。无论选哪条路，都先冻结继续放量并保留现场证据。

::interviewer::
如果现场验证这项回滚止血判断，先看哪些指标或日志？

::candidate level="deep"::
灰度期间分别看新旧版本错误率、P99、核心业务成功率和数据校验结果，回滚演练要覆盖配置与数据库兼容性。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
回滚不是撤销按钮。消息格式、缓存内容和外部 API 一旦改变，旧版本可能无法接管；这些跨版本契约必须提前设计兼容窗口。
