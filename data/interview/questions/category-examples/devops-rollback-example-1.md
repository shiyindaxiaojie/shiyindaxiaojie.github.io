---
id: devops-rollback-example-1
title: "数据库已经变更、应用刚开始灰度，怎么设计可回滚发布？"
slug: devops-rollback-example-1
tracks:
  - devops
category: rollback
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "回滚止血"
  - "数据库兼容"
  - "灰度发布"
  - "向前修复"
summary: "围绕回滚止血的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
数据库已经变更、应用刚开始灰度，怎么设计可回滚发布？

::candidate level="core"::
先按 expand-and-contract 拆数据库变更：新增兼容结构，双读或双写验证，再切应用，最后清理旧结构。应用回滚时旧版本仍能读写新 schema；数据修复另走可审计任务，不能把 DDL 和全量数据迁移塞进一次发布。

::interviewer::
这个回滚止血方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
灰度期间分别看新旧版本错误率、P99、核心业务成功率和数据校验结果，回滚演练要覆盖配置与数据库兼容性。

::interviewer::
回滚止血发生部分失败时，系统怎样收敛？

::candidate::
回滚不是撤销按钮。消息格式、缓存内容和外部 API 一旦改变，旧版本可能无法接管；这些跨版本契约必须提前设计兼容窗口。
