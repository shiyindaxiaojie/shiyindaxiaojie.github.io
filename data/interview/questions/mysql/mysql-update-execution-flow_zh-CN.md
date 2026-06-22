---
title: MySQL 执行一条更新语句经历了哪些流程？
---

::interviewer::
我问个很常见的 MySQL 题。

```sql
UPDATE account
SET balance = balance - 100
WHERE id = 7;
```

这条语句返回成功前，MySQL 里面大概走了哪些动作？

::candidate::
如果 `id` 是主键，这条链路不算绕。

Server 层拿到 SQL，做权限检查、解析，选主键访问。后面真正改记录的是 InnoDB。它先找到那一行，数据页不在内存就读进 [[Buffer Pool]]，然后给记录加锁，写 [[undo log]]，再改内存里的数据页。

提交时会进入日志提交链路。InnoDB 先把 [[redo log]] 写到 prepare 状态，Server 层写 [[binlog]]，最后 InnoDB 把 redo 标成 commit。客户端看到成功，一般是在这条提交链路走完之后。

::interviewer::
为什么改记录前要先写 undo？

::candidate::
因为新值不是 MySQL 唯一要保住的东西。

事务可能回滚，别的事务也可能正在读旧快照。undo 保存旧版本，回滚能用，[[MVCC]] 的一致性读也能用。redo 负责崩溃后把改动重放回来，undo 负责旧版本和回滚，这俩别混。

::interviewer::
redo 和 binlog 为什么要搞两阶段提交？

::candidate::
因为它们不是同一个东西。

redo 是 InnoDB 的崩溃恢复日志，binlog 是 Server 层的复制和归档日志。只写完其中一个就宕机，主库恢复出来的数据和从库拿到的日志可能对不上。所以流程才拆成 redo prepare、写 binlog、redo commit。恢复时 MySQL 能对着两份日志判断这笔事务该留还是该丢。

::interviewer::
UPDATE 已经返回成功了，数据页一定刷到磁盘了吗？

::candidate::
不一定。

数据页可能还是 Buffer Pool 里的脏页，后面再刷盘。提交时真正要盯的是 redo 和 binlog 的持久化策略，也就是 `innodb_flush_log_at_trx_commit` 和 `sync_binlog`。严格配置下日志刷得更勤，丢数据窗口更小。数据页晚点刷没关系，redo 还在，崩溃后能修回来。

::interviewer::
如果条件换成这样呢？

```sql
UPDATE account
SET status = 1
WHERE status = 0
LIMIT 1;
```

风险会变在哪里？

::candidate::
这时麻烦往往不在改那一行，而在找那一行。

`status` 没有合适索引，或者索引选择性很差，InnoDB 可能扫很多记录才碰到要改的那一行。扫描和修改过程中会持有锁，隔离级别和索引条件再凑得不好，还可能牵出 [[间隙锁]]。一个看起来只改一行的 UPDATE，就可能变成锁等待、死锁，或者主从延迟。

排查时我会看执行计划、锁等待、事务持续时间、扫描行数，而不是只盯 `Rows_affected`。

::interviewer::
`Rows_examined` 很大，但 `Rows_affected` 只有 `1`，你怎么判断？

::candidate::
改得少，不代表代价小。

这通常说明定位记录很贵。可能条件没有贴着索引顺序走，可能索引选择性太差，也可能 `LIMIT 1` 扫了很久才遇到第一条满足的记录。这个时候加索引不只是为了查得快，还会缩短锁范围、减少事务持有时间，也能减轻从库回放压力。

::interviewer::
主从复制里，这条 UPDATE 又怎么走？

::candidate::
主库提交时写 binlog，从库拿到 binlog 后回放。

row 模式记录具体改了哪一行，statement 模式记录原 SQL。线上更常见的是 row 模式，确定性好一点，代价是日志可能更大。如果一次更新太多行，或者事务拖得很长，从库回放就会慢，延迟也会跟着冒出来。

::interviewer::
我会给 **8/10**。

主线是对的。你把找记录、改内存页、写 undo、提交 redo 和 binlog 这几段拆开了，也没有把 undo、redo、binlog 混成一锅粥。线上真出问题时，这种拆法能直接落到锁等待、崩溃恢复和主从延迟。

如果继续追，我会问二级索引字段被更新时要多改哪些索引页，唯一键冲突怎么处理，死锁日志怎么看，以及非严格刷盘配置下到底可能丢哪一段。

::related::
- mysql-mvcc
- mysql-leftmost-prefix

::terms::
Buffer Pool = InnoDB 缓存数据页和索引页的内存区域。更新通常先改内存页，脏页稍后再刷盘。
undo log = 保存旧版本的日志，用于事务回滚，也给 MVCC 一致性读提供历史版本。
redo log = InnoDB 的物理崩溃恢复日志。宕机后可以靠它把已提交的数据页变化重放回来。
binlog = Server 层逻辑日志，主要用于主从复制、按时间点恢复和审计回放。
MVCC = 多版本并发控制。InnoDB 通过行版本和 Read View 让一部分读写不用互相阻塞。
间隙锁 = 锁住索引记录之间的范围。InnoDB 在一些可重复读场景里会用它挡住幻读。
