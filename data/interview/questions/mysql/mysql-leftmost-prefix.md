---
id: mysql-leftmost-prefix
title: 联合索引为什么经常强调最左前缀？
slug: mysql-leftmost-prefix
tracks:
  - java-backend
  - go-backend
  - python-engineer
category: mysql
stage: technical
difficulty: junior
questionType: principle
frequency: high
tags:
  - 联合索引
  - 最左前缀
  - B+Tree
  - 回表
summary: 这是基础题，但能不能从底层有序性解释，会直接暴露真实理解深度。
estimatedRead: 4
related:
  - mysql-mvcc
---

::interviewer::
联合索引为什么经常强调最左前缀？

::candidate level="core"::
因为 B+ 树里的联合索引是按最左列开始排序的，查询条件如果跳过左边列，后面的列就没法继续稳定缩小范围。

::interviewer::
别只背口诀，你举个例子。

::candidate::
比如索引是 `(a, b, c)`。  
如果条件是 `a = 1 and b = 2`，可以沿着有序性继续定位。  
如果直接查 `b = 2`，因为同一个 `b` 可能对应很多不同的 `a`，树上没有按 `b` 单独排好序，就不能像前者那样快速定位。

::candidate level="deep"::
面试里再往下会追问两件事：

1. 范围查询会在哪一列停止继续匹配。
2. 覆盖索引和回表对性能有什么影响。

::note::
能从“有序性”讲出来，会比只说“联合索引要遵循最左前缀原则”更扎实。
