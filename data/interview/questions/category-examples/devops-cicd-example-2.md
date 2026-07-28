---
id: devops-cicd-example-2
title: "蓝绿发布和金丝雀发布怎么选，回滚条件分别是什么？"
slug: devops-cicd-example-2
tracks:
  - devops
category: cicd
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "CI/CD"
  - "制品追踪"
  - "灰度发布"
  - "幂等部署"
summary: "围绕CI/CD的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
蓝绿发布和金丝雀发布怎么选，回滚条件分别是什么？

::candidate level="deep"::
蓝绿更适合环境可成套切换、数据库兼容性已处理的场景，回滚快但资源成本高。金丝雀适合用真实流量验证风险，关键是按用户或实例稳定分流，并在错误率、P99 和业务指标越线时自动暂停或回滚。

::interviewer::
如果现场现象和预期不一致，CI/CD怎么继续缩小范围？

::candidate level="deep"::
检查制品摘要、Git 提交、流水线运行号、目标实例和审批记录能否串成一条审计链；灰度指标必须标注新旧版本。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
数据库不可逆变更会让应用回滚失效。先做向前兼容的 schema 变更，再切应用流量，最后清理旧字段，发布顺序本身就是边界。
