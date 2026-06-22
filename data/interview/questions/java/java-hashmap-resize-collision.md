---
id: java-hashmap-resize-collision
title: HashMap 的 put、冲突和扩容到底会影响什么？
slug: java-hashmap-resize-collision
tracks:
  - java-backend
category: java
difficulty: senior
questionType: principle
frequency: high
tags:
  - Java
  - HashMap 扩容
  - 哈希冲突
  - 红黑树
  - equals/hashCode 契约
summary: 从一次 put 追到哈希扰动、冲突处理、树化条件、扩容迁移和并发误用风险。
estimatedRead: 6
related:
  - java-concurrenthashmap-locking
  - java-arraylist-copyonwrite
---

::interviewer::
你说自己常用 HashMap。那一次 put 进去，内部大概发生了什么？

::candidate level="core"::
我会把它拆成三步看：先根据 key 的 hash 算桶位置，再看桶里有没有冲突，最后决定是新增、覆盖还是挂到链表或树里。真正影响性能的不是 put 这个动作本身，而是 hash 是否分散、桶里链表是否过长、以及扩容时是否会集中迁移。

::interviewer::
为什么 HashMap 还要做 hash 扰动？直接用 key 的 hashCode 不行吗？

::candidate::
理论上可以，但数组长度通常是 2 的幂，定位桶时主要看低位。如果很多 key 的低位分布不好，就会挤到同一批桶里。扰动是把高位信息折到低位，让桶分布更均匀一点，它不是消灭冲突，只是降低冲突变坏的概率。

::interviewer::
链表什么时候会变红黑树？为什么不是一冲突就树化？

::candidate level="deep"::
JDK 8 里桶内节点超过阈值才考虑树化，但还要看整个数组容量够不够。容量太小时，优先扩容，因为冲突可能只是桶太少造成的；这时直接树化会把问题复杂化。红黑树主要解决极端冲突下链表退化的问题，但它维护成本更高，所以不能把它当成默认结构。

::interviewer::
HashMap 扩容为什么容易成为性能问题？

::candidate::
扩容不是简单换个长度，它要把旧桶里的节点重新分布到新数组里。虽然 JDK 8 能利用旧索引和旧索引加旧容量这两个位置来迁移，但迁移本身仍然要消耗 CPU 和内存带宽。如果一个热路径不断触发扩容，延迟会出现尖刺，所以能估容量时我会初始化容量，避免运行中频繁 resize。

::interviewer::
如果 key 是自定义对象，你会特别注意什么？

::candidate::
重点是 equals 和 hashCode 要满足同一个语义。两个对象 equals 为 true，hashCode 必须一致，否则会出现“明明逻辑相同却查不到”的问题。还有一个隐蔽点是 key 最好不要在放入 Map 后再修改参与 hash 的字段，不然它可能还在原桶里，但你已经用新 hash 去找了。

::interviewer::
HashMap 能不能在多线程里用？只是读多写少的话呢？

::candidate::
纯只读可以，但前提是构建完成后不再变。如果还有写入，就不应该靠“写得少”赌安全。问题不只是数据覆盖，还包括扩容迁移期间结构变化导致读到不一致的数据。读多写少我会看场景选不可变 Map、ConcurrentHashMap，或者用快照替换，而不是把 HashMap 直接暴露给并发写。

::interviewer::
线上怀疑某个 HashMap 缓存太大或 key 分布很差，你怎么拿证据？

::candidate::
我会先看它是不是内存大户：`jcmd <pid> GC.class_histogram | grep -E 'HashMap|Node'` 只能粗看数量，更可靠的是拿 heap dump：`jcmd <pid> GC.heap_dump /tmp/map.hprof`，用 MAT 看 Dominator Tree 里具体哪个 Map retained size 最大。key 分布问题如果能在测试环境复现，我会把 key 样本导出来统计 hash 桶分布，或者用 JMH 做 put/get 延迟对比。线上不靠“感觉冲突多”，要靠 dump、样本和压测数据。
