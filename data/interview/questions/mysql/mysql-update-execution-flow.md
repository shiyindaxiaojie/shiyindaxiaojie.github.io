---
title: What happens inside MySQL when an UPDATE runs?
tracks:
  - java-backend
  - go-backend
  - python-engineer
category: mysql
frequency: high
tags:
  - update-chain
  - transaction-log
  - two-phase-commit
  - row-lock
  - crash-recovery
related:
  - mysql-mvcc
  - mysql-leftmost-prefix
---

::interviewer::
Suppose this statement has just returned success.

```sql
UPDATE account
SET balance = balance - 100
WHERE id = 7;
```

What roughly happened inside MySQL before the client got `OK`?

::candidate::
If `id` is the primary key, the path is fairly short.

The Server layer receives the SQL, checks privileges, parses it, and chooses primary-key access. InnoDB then finds the record, reads the page into [[Buffer Pool]] if it is not already there, locks the row, writes [[undo log]], and changes the in-memory page.

On commit, InnoDB writes [[redo log]] in prepare state, the Server layer writes [[binlog]], and then InnoDB marks redo as commit. The client sees success after this commit path finishes under the current flush settings.

::interviewer::
Why does InnoDB write undo before changing the row?

::candidate::
Because the new value is not the only value MySQL may need.

The transaction may roll back. Another transaction may also be reading an older snapshot. Undo keeps the previous version, so rollback and [[MVCC]] both have somewhere to go. Redo handles crash replay. Undo handles old versions and rollback.

::interviewer::
Why do redo log and binlog need two-phase commit?

::candidate::
They are written by different layers and serve different jobs.

Redo is for InnoDB crash recovery. Binlog is for replication and recovery outside InnoDB. If MySQL crashes after only one of them is durable, the primary and replicas can disagree. So the commit is split into redo prepare, binlog write, redo commit. During recovery, MySQL can look at both logs and decide whether the transaction should be kept.

::interviewer::
After `OK`, has the updated data page definitely reached disk?

::candidate::
Not necessarily.

The row page may still be a dirty page in Buffer Pool. What needs to be durable at commit time is controlled by `innodb_flush_log_at_trx_commit` and `sync_binlog`. With the strict settings, redo and binlog are flushed more aggressively. The data page itself can be flushed later, because redo can repair it after a crash.

::interviewer::
Change the condition a little.

```sql
UPDATE account
SET status = 1
WHERE status = 0
LIMIT 1;
```

What becomes risky now?

::candidate::
Finding the row may become more expensive than changing it.

If `status` has no useful index, or the index is not selective, InnoDB may scan many records before it finds the one row to update. While scanning and modifying, it can hold row locks, and under some isolation and index patterns it may also involve [[gap locks]]. That turns a small update into lock waiting, replica lag, or a deadlock report.

I would check the actual plan, lock waits, transaction duration, and how many rows were examined, not just `Rows_affected`.

::interviewer::
If `Rows_examined` is huge but `Rows_affected` is `1`, what does that tell you?

::candidate::
The write is cheap. The search is not.

The condition may not match the index order, the chosen index may have weak selectivity, or `LIMIT 1` may be finding the first matching row very late. In that case an index is not only a query optimization. It also shrinks the lock range, shortens transaction time, and reduces the work replicas must replay.

::interviewer::
How does this UPDATE show up on a replica?

::candidate::
The primary writes binlog after the statement is ready to commit. The replica receives that binlog and replays it.

With row-based binlog, the log records which row changed and what the new image looks like. With statement-based binlog, it records the SQL. Production systems usually prefer row-based logging for determinism, although it can produce larger logs. Large updates, long transactions, and slow replay can all show up as replica lag.

::interviewer::
Score **8/10**.

You separated the path that finds the row from the path that commits the transaction, and you did not mix up undo, redo, and binlog. That is the useful part in a real incident.

The missing part is pressure testing the edge cases. Next I would ask what changes under secondary-index updates, unique-key conflicts, deadlocks, and non-strict flush settings.

::related::
- mysql-mvcc
- mysql-leftmost-prefix

::terms::
Buffer Pool = The in-memory cache for InnoDB data and index pages. Updates usually modify pages in memory first, then flush dirty pages later.
undo log = The old row version used for rollback and MVCC consistent reads.
redo log = InnoDB physical crash-recovery log. It lets MySQL replay committed page changes after a crash.
binlog = Server-layer logical log used for replication, point-in-time recovery, and audit-style replay.
MVCC = Multi-Version Concurrency Control. InnoDB uses row versions and Read View snapshots so readers and writers do not always block each other.
gap locks = Locks on gaps between index records. InnoDB uses them in some repeatable-read cases to prevent phantom rows.
