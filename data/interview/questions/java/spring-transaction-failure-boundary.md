---
id: spring-transaction-failure-boundary
title: Spring 事务没回滚时，你会怎么定位边界问题？
slug: spring-transaction-failure-boundary
tracks:
  - java-backend
category: spring-boot
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - Spring Boot
  - 事务失效
  - 代理边界
  - 传播行为
  - 回滚规则
summary: 以代理调用、异常路径、传播行为和数据库事务能力为主线，定位声明式事务失效。
estimatedRead: 6
related:
  - spring-ioc-aop-circular-dependency
  - system-design-idempotency
---

::interviewer::
Spring 声明式事务为什么不是在方法里写几行代码那么简单？

::candidate level="core"::
因为它本质上是 AOP 代理在方法外面包了一层事务拦截器。排查时我会打开事务日志，比如 `logging.level.org.springframework.transaction=TRACE`、`logging.level.org.springframework.jdbc.datasource.DataSourceTransactionManager=DEBUG`，看有没有 Creating transaction、Committing、Rolling back。先证明事务拦截器真的进来了，再看回滚规则。

::interviewer::
哪些情况最容易让事务看起来写了，实际没生效？

::candidate::
常见是 this 内部调用、方法不是 public、异常被 catch 后没有继续抛、默认回滚规则不匹配、数据库表不支持事务、异步线程里继续操作数据库，或者不同数据源没有纳入同一个事务管理器。它们的共同点是破坏了代理拦截、异常感知或数据库提交边界。

::interviewer::
this 调用为什么会绕过事务？

::candidate level="deep"::
this 指向的是目标对象本身，不是 Spring 生成的代理对象。类内部 A 方法调 B 方法，本质是普通 Java 调用，不会再经过事务拦截器。解决上可以拆到另一个 Bean 通过代理调用，也可以用 TransactionTemplate 明确事务边界。但如果经常需要这么做，我会反过来看服务职责是不是切得太碎或太乱。

::interviewer::
异常被 catch 之后，事务还能回滚吗？

::candidate::
如果 catch 后没有继续抛出，代理看到的是正常返回，默认就会提交。实操验证很简单：写一个集成测试，方法里插入两张表，中间抛异常，然后分别测试 catch 吞掉、重新抛出、`TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()` 三种路径，最后查数据库最终状态。事务问题一定要用最终数据验证。

::interviewer::
REQUIRED 和 REQUIRES_NEW 的差别在线上会带来什么影响？

::candidate::
REQUIRED 会加入当前事务，没有就新建，所以内外层通常一起提交或一起回滚。REQUIRES_NEW 会挂起外层事务，自己开一个新事务，内层提交后即使外层后面回滚，内层也可能已经落库。这个差别会直接影响审计日志、消息表、补偿记录这类场景，不能只按名字选传播行为。

::interviewer::
线上发现订单失败了，但部分数据已经写进库，你会怎么查？

::candidate::
我会先把调用链按事务边界画出来，标出哪些方法有事务、哪些是 `this` 内部调用、哪些用了 `REQUIRES_NEW` 或异步。然后开事务日志看 begin/commit/rollback，开 SQL 日志看每条写入落在哪个数据源。最后写集成测试复现失败路径，断言数据库最终状态。只看代码上有 `@Transactional` 不够，必须看代理、日志和最终数据。
