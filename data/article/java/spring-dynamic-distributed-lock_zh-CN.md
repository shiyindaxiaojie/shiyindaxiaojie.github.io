---
title: Spring Boot 实现可扩展的分布式锁
date: 2024-02-02
description: 封装通用接口，屏蔽 API 细节，基于 Spring Boot 自动装配管理。
tags:
  - 扩展点
  - Spring
  - Spring Boot
  - 分布式锁
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# 背景

在 Java 中分布式锁的实现框架‌主要包括基于 `数据库`、`Redis` 和 `Zookeeper` 的实现方式。使用 `Redis` 实现的组件可以选择 `Jedis API` 或者 `Redisson API`，使用 `Zookeeper` 实现的组件可以选择 `Zookeeper API` 或者 `Curator API`。笔者在项目中看到不少这种混用 API 的情况，维护性较差。

# 目标

封装通用接口，屏蔽 API 细节，基于 Spring Boot 自动装配管理。

# 实现
 
首先，定义分布式锁接口。

```java
public interface DistributedLock {

	/**
	 * 锁类型
	 *
	 * @return 锁类型
	 */
	String lockType();

	/**
	 * 加锁（阻塞）
	 *
	 * @param key 锁对象
	 */
	boolean lock(String key);

	/**
	 * 加锁（阻塞直到超时）
	 *
	 * @param key      锁对象
	 * @param waitTime 等待时间
	 * @param timeUnit 时间单位
	 * @return 是否加锁成功
	 */
	boolean lock(String key, int waitTime, TimeUnit timeUnit);

	/**
	 * 释放锁
	 *
	 * @param key 锁对象
	 */
	void unlock(String key);
}
```

使用 Jedis 实现接口。

```java
@RequiredArgsConstructor
@Slf4j
public class JedisDistributedLock implements DistributedLock {

	private static final String UNLOCK_LUA =
		"if redis.call(\"get\",KEYS[1]) == ARGV[1] "
			+ "then return redis.call(\"del\",KEYS[1])"
			+ "else return 0 end";

	private final TransmittableThreadLocal<String> threadLocal = new TransmittableThreadLocal<>();

	private final Jedis jedis;

	/**
	 * 锁类型
	 *
	 * @return 锁类型
	 */
	@Override
	public String lockType() {
		return DistributedLockType.JEDIS.name();
	}

	/**
	 * 阻塞加锁
	 *
	 * @param key 锁对象
	 */
	@Override
	public boolean lock(@NonNull String key) {
		log.debug("Jedis create lock '{}'", key);
		String value = UUID.randomUUID().toString();
		SetParams setParams = new SetParams();
		setParams.ex(-1);
		boolean isSuccess;
		try {
			String result = jedis.set(key, value, setParams);
			isSuccess = StringUtils.isNotEmpty(result);
		} catch (Exception e) {
			log.error("Jedis create lock '{}', catch exception: {}", key, e.getMessage(), e);
			throw new DistributedLockAcquireException(e);
		}
		if (isSuccess) {
			threadLocal.set(value);
			log.debug("Jedis create lock '{}' successfully", key);
		} else {
			log.warn("Jedis create lock '{}' failed", key);
		}
		return isSuccess;
	}

	/**
	 * 加锁
	 *
	 * @param key      锁对象
	 * @param waitTime 等待时间
	 * @param timeUnit 时间单位
	 * @return 加锁是否成功
	 */
	@Override
	public boolean lock(@NonNull String key, int waitTime, TimeUnit timeUnit) {
		log.warn("Jedis create lock '{}' not support waitTime", key);
		return lock(key);
	}

	/**
	 * 释放锁
	 *
	 * @param key 锁对象
	 */
	@Override
	public void unlock(@NonNull String key) {
		log.debug("Jedis release lock '{}'", key);
		String uuid = threadLocal.get();
		if (uuid == null) {
			log.warn("Jedis release lock '{}' failed due to thread local is null", key);
			return;
		}
		List<String> args = Collections.singletonList(uuid);
		List<String> keys = Collections.singletonList(key);
		Long result;
		try {
			result = (Long) jedis.eval(UNLOCK_LUA, keys, args);
		} catch (Exception e) {
			log.error("Jedis release lock '{}', catch exception: {}", key, e.getMessage(), e);
			throw new DistributedLockReleaseException(e);
		}
		if (result == null || result == 0L) {
			log.warn("Jedis release lock '{}', but it not work", key);
		} else {
			log.debug("Jedis release lock '{}' successfully", key);
		}
	}
}
```

使用 Redisson 实现接口。

```java
@RequiredArgsConstructor
@Slf4j
public class RedissonDistributedLock implements DistributedLock {

	private static final TransmittableThreadLocal<RLock> threadLocal = new TransmittableThreadLocal<>();

	private final RedissonClient redissonClient;

	/**
	 * 锁类型
	 *
	 * @return 锁类型
	 */
	@Override
	public String lockType() {
		return DistributedLockType.REDISSON.name();
	}

	/**
	 * 阻塞加锁
	 *
	 * @param key 锁对象
	 */
	@Override
	public boolean lock(@NonNull String key) {
		log.debug("Redisson create lock '{}'", key);
		RLock rLock = redissonClient.getFairLock(key);
		boolean isSuccess;
		try {
			isSuccess = rLock.tryLock();
		} catch (Exception e) {
			log.error("Redisson create lock '{}', catch exception: {}", key, e.getMessage(), e);
			throw new DistributedLockAcquireException(e);
		}
		return isSuccess;
	}

	/**
	 * 加锁
	 *
	 * @param key      锁对象
	 * @param waitTime 等待时间
	 * @param timeUnit 时间单位
	 * @return 加锁是否成功
	 */
	@Override
	public boolean lock(@NonNull String key, int waitTime, TimeUnit timeUnit) {
		log.debug("Redisson create lock '{}' with waitTime '{}'", key, waitTime);
		RLock rLock = redissonClient.getFairLock(key);
		boolean isSuccess;
		try {
			isSuccess = rLock.tryLock(waitTime, 1, timeUnit);
		} catch (Exception e) {
			log.error("Redisson create lock '{}' with waitTime '{}', catch exception: {}", key, waitTime, e.getMessage(), e);
			throw new DistributedLockTimeoutException(e);
		}
		if (isSuccess) {
			threadLocal.set(rLock);
			log.debug("Redisson create lock '{}' with waitTime '{}' successfully", key, waitTime);
		} else {
			log.warn("Redisson create lock '{}' with waitTime '{}' failed", key, waitTime);
		}
		return isSuccess;
	}

	/**
	 * 释放锁
	 *
	 * @param key 锁对象
	 */
	@Override
	public void unlock(@NonNull String key) {
		log.debug("Redisson release lock '{}'", key);
		RLock rLock = threadLocal.get();
		if (rLock == null) {
			log.warn("Redisson release lock '{}' failed due to thread local is null", key);
			return;
		}
		if (!rLock.isHeldByCurrentThread()) {
			log.warn("Curator release lock '{}' failed that is not held by current thread", key);
			return;
		}
		try {
			rLock.unlock();
			threadLocal.remove();
		} catch (Exception e) {
			log.error("Redisson release lock '{}', catch exception: {}", key, e.getMessage(), e);
			throw new DistributedLockReleaseException(e);
		}
		log.debug("Redisson release lock '{}' successfully", key);
	}
}
```

使用 Zookeeper 实现接口。

```java
@RequiredArgsConstructor
@Slf4j
public class ZookeeperDistributedLock implements DistributedLock {

	private static final TransmittableThreadLocal<String> threadLocal = new TransmittableThreadLocal<>();

	private static final byte[] EMPTY_DATA = new byte[0];

	private final ZooKeeper zooKeeper;

	/**
	 * 锁类型
	 *
	 * @return 锁类型
	 */
	@Override
	public String lockType() {
		return DistributedLockType.ZOOKEEPER.name();
	}

	/**
	 * 阻塞加锁
	 *
	 * @param key 锁对象
	 */
	@Override
	public boolean lock(@NonNull String key) {
		log.debug("Zookeeper create lock '{}'", key);
		boolean isSuccess;
		String result;
		try {
			result = zooKeeper.create(key, EMPTY_DATA, ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL_SEQUENTIAL);
			isSuccess = StringUtils.isNotEmpty(result);
		} catch (Exception e) {
			log.error("Zookeeper create lock '{}', catch exception: {}", key, e.getMessage(), e);
			throw new DistributedLockAcquireException(e);
		}
		if (isSuccess) {
			threadLocal.set(result);
			log.debug("Zookeeper create lock '{}' successfully", key);
		} else {
			log.warn("Zookeeper create lock '{}' failed", key);
		}
		return isSuccess;
	}

	/**
	 * 加锁
	 *
	 * @param key      锁对象
	 * @param waitTime 等待时间
	 * @param timeUnit 时间单位
	 * @return 加锁是否成功
	 */
	@Override
	public boolean lock(@NonNull String key, int waitTime, TimeUnit timeUnit) {
		log.warn("Zookeeper create lock '{}' not support waitTime", key);
		return lock(key);
	}

	/**
	 * 释放锁
	 *
	 * @param key 锁对象
	 */
	@Override
	public void unlock(@NonNull String key) {
		log.debug("Zookeeper release lock '{}'", key);
		String result = threadLocal.get();
		if (result == null) {
			log.warn("Zookeeper release lock '{}' failed due to thread local is null", key);
			return;
		}
		try {
			zooKeeper.delete(key, -1);
		} catch (Exception e) {
			log.error("Zookeeper release lock '{}', catch exception: {}", key, e.getMessage(), e);
			throw new DistributedLockReleaseException(e);
		}
		log.debug("Zookeeper release lock '{}' successfully", key);
	}
}
```

使用 Curator 实现接口。

```java
@RequiredArgsConstructor
@Slf4j
public class CuratorDistributedLock implements DistributedLock {

	private static final TransmittableThreadLocal<InterProcessMutex> threadLocal = new TransmittableThreadLocal<>();

	private final CuratorFramework curatorFramework;

	/**
	 * 锁类型
	 *
	 * @return 锁类型
	 */
	@Override
	public String lockType() {
		return DistributedLockType.CURATOR.name();
	}

	/**
	 * 阻塞加锁
	 *
	 * @param key 锁对象
	 */
	@Override
	public boolean lock(@NonNull String key) {
		log.debug("Curator create lock '{}'", key);
		if (!key.startsWith(Strings.SLASH)) {
			throw new DistributedLockAcquireException("Invalid curator lock: " + key);
		}
		InterProcessMutex interProcessMutex = new InterProcessMutex(curatorFramework, key);
		try {
			interProcessMutex.acquire();
			threadLocal.set(interProcessMutex);
		} catch (Exception e) {
			log.error("Curator create lock '{}', catch exception: {}", key, e.getMessage(), e);
			throw new DistributedLockAcquireException(e);
		}
		log.debug("Curator create lock '{}' successfully", key);
		return true;
	}

	/**
	 * 加锁
	 *
	 * @param key      锁对象
	 * @param waitTime 等待时间
	 * @param timeUnit 时间单位
	 * @return 加锁是否成功
	 */
	@Override
	public boolean lock(@NonNull String key, int waitTime, TimeUnit timeUnit) {
		log.debug("Curator create lock '{}' with waitTime '{}'", key, waitTime);
		if (!key.startsWith(Strings.SLASH)) {
			throw new DistributedLockAcquireException("Invalid curator lock: " + key);
		}
		InterProcessMutex interProcessMutex = new InterProcessMutex(curatorFramework, key);
		boolean isSuccess;
		try {
			isSuccess = interProcessMutex.acquire(waitTime, timeUnit);
		} catch (Exception e) {
			log.error("Curator create lock '{}' with waitTime '{}', catch exception: {}", key, waitTime, e.getMessage(), e);
			throw new DistributedLockTimeoutException(e);
		}
		if (isSuccess) {
			threadLocal.set(interProcessMutex);
			log.debug("Curator create lock '{}' with waitTime '{} successfully", key, waitTime);
		} else {
			log.warn("Curator create lock '{}' with waitTime '{} failed", key, waitTime);
		}
		return isSuccess;
	}

	/**
	 * 释放锁
	 *
	 * @param key 锁对象
	 */
	@Override
	public void unlock(@NonNull String key) {
		log.debug("Curator release lock '{}'", key);
		InterProcessMutex interProcessMutex = threadLocal.get();
		if (interProcessMutex == null) {
			log.warn("Curator release lock '{}' failed due to thread local is null", key);
			return;
		}
		if (!interProcessMutex.isAcquiredInThisProcess()) {
			log.warn("Curator release lock '{}' failed that is not acquired in process", key);
			return;
		}
		try {
			interProcessMutex.release();
			threadLocal.remove();
		} catch (Exception e) {
			log.error("Curator release lock: {}, catch exception: {}", key, e.getMessage(), e);
			throw new DistributedLockReleaseException(e.getMessage());
		}
		log.debug("Curator release lock '{}' successfully", key);
	}
}
```

将具体实现放入 Spring Boot 管理。

```java
@Setter
@Getter
@ConfigurationProperties(prefix = "distributed-lock")
public class DistributedLockProperties {

	private boolean enabled;

	private String primary;

	private final Redisson redisson = new Redisson();

	private final Jedis jedis = new Jedis();

	private final Curator curator = new Curator();

	private final ZooKeeper zooKeeper = new ZooKeeper();

	@Setter
	@Getter
	public static class Redisson {

		private boolean enabled;
	}

	@Setter
	@Getter
	public static class Jedis {

		private boolean enabled;
	}

	@Setter
	@Getter
	public static class Curator {

		private boolean enabled;
	}

	@Setter
	@Getter
	public static class ZooKeeper {

		private boolean enabled;
	}
}

@ConditionalOnProperty(prefix = "distributed-lock.jedis", name = "enabled", havingValue = true)
@ConditionalOnBean(Jedis.class)
@ConditionalOnClass(Jedis.class)
@Slf4j
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Configuration(proxyBeanMethods = false)
public class JedisDistributedLockAutoConfiguration {

	@Bean
	public DistributedLock distributedLock(Jedis jedis) {
		log.debug("Autowired JedisDistributedLock");
		return new JedisDistributedLock(jedis);
	}
}

@ConditionalOnProperty(prefix = "distributed-lock.redisson", name = "enabled", havingValue = true)
@AutoConfigureAfter(RedissonAutoConfiguration.class)
@ConditionalOnBean(RedissonClient.class)
@ConditionalOnClass(Redisson.class)
@Slf4j
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Configuration(proxyBeanMethods = false)
public class RedissonDistributedLockAutoConfiguration {

	@Bean
	public DistributedLock distributedLock(RedissonClient redissonClient) {
		log.debug("Autowired RedissonDistributedLock");
		return new RedissonDistributedLock(redissonClient);
	}
}

@ConditionalOnProperty(prefix = "distributed-lock.zookeeper", name = "enabled", havingValue = true)
@ConditionalOnClass(ZooKeeper.class)
@ConditionalOnBean(ZookeeperTemplate.class)
@Slf4j
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Configuration(proxyBeanMethods = false)
public class ZookeeperDistributedLockAutoConfiguration {

	@Bean
	public DistributedLock distributedLock(ZookeeperTemplate zookeeperTemplate) {
		log.debug("Autowired ZookeeperDistributedLock");
		return new ZookeeperDistributedLock(zookeeperTemplate.getZookeeper());
	}
}

@ConditionalOnProperty(prefix = "distributed-lock.curator", name = "enabled", havingValue = true)
@ConditionalOnClass(CuratorFramework.class)
@Slf4j
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Configuration(proxyBeanMethods = false)
public class CuratorDistributedLockAutoConfiguration {

	@Bean
	public DistributedLock distributedLock(CuratorFramework curatorFramework) {
		log.debug("Autowired CuratorDistributedLock");
		return new CuratorDistributedLock(curatorFramework);
	}
}
```

当项目配置 `distributed-lock.redisson.enabled=true` 时，开启 Redisson 作为分布式锁的底层实现。

```yaml
distributed-lock:
  redisson:
    enabled: true # 开启 Redisson 作为分布式锁的底层实现

spring:
  redis:
    password: demo@123
    timeout: 5000
    database: 1
    host: localhost
    port: 6379	
```

当项目配置 `distributed-lock.curator.enabled=true` 时，开启 Curator 作为分布式锁的底层实现。

```yaml
distributed-lock:
  curator:
    enabled: true # 开启 Curator 作为分布式锁的底层实现

spring:
  cloud:
  	zookeeper:
	  enabled: true
	  connectString: localhost:2181
```

业务代码只需要引入 `DistributedLock` 接口，调用 `lock` 和 `unlock` 方法完成分布式场景的加锁和解锁。

```java
@RequiredArgsConstructor
@Slf4j
public cliass Demo {

	private final DistributedLock distributedLock;

	public void test() {
		String key = "demo";
		if (distributedLock.lock(key, 2, TimeUnit.SECONDS)) {
			// do something...
			distributedLock.unlock(key);
		}
	}
}
```

# 产出

通过 API 封装，简化了业务项目对分布式锁的繁琐编码工作，提高开发效率。

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-distributed-lock](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-solutions/eden-distributed-lock) 和 [eden-distributed-lock-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-distributed-lock-spring-boot-starter)。