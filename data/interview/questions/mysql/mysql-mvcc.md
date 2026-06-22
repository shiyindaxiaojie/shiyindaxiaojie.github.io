---
id: mysql-mvcc
title: MySQL 的 MVCC 到底解决了什么问题？
slug: mysql-mvcc
tracks:
  - java-backend
  - go-backend
  - python-engineer
category: mysql
difficulty: intermediate
questionType: principle
frequency: high
tags:
  - MVCC
  - Read View
  - Undo Log
  - 事务隔离
summary: 面试高频题，重点在于并发读写和版本可见性，而不只是背概念。
estimatedRead: 7
related:
  - mysql-leftmost-prefix
---

::interviewer::
MySQL 的 MVCC 解决了什么问题？

::candidate level="core"::
它解决的是“读写并发时，尽量让读不阻塞写、写不阻塞读”的问题，让普通一致性读可以基于版本快照完成。

::interviewer::
那它是怎么做到的？

::candidate::
核心是隐藏字段、undo log 和 Read View：

1. 行记录带事务版本信息。
2. 更新时旧版本写到 undo log，形成版本链。
3. 读请求根据当前事务的 Read View 决定应该看到哪个版本。

::candidate level="deep"::
但 MVCC 不是万能的。  
它主要作用于一致性读，不是说所有场景都不加锁。像当前读、加锁读，还是会进入锁机制。  
另外，幻读在 InnoDB 下还要结合间隙锁、临键锁这些机制一起看。

::note::
如果你只会说“多版本并发控制让读写不冲突”，通常只拿到及格分。
