---
title: Implementing Extensible Distributed Locks with Spring Boot
date: 2024-02-02
description: Encapsulate generic interfaces, shield API details, and manage based on Spring Boot automatic assembly.
tags:
  - Extension Point
  - Spring
  - Spring Boot
  - Distributed Lock
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# Background

In Java, the implementation frameworks for distributed locks mainly include those based on `Database`, `Redis`, and `Zookeeper`. For components implemented using `Redis`, you can choose `Jedis API` or `Redisson API`. For components implemented using `Zookeeper`, you can choose `Zookeeper API` or `Curator API`. I have seen many cases of mixing these APIs in projects, which results in poor maintainability.

# Goal

Encapsulate generic interfaces, shield API details, and manage based on Spring Boot automatic assembly.

# Implementation

First, define the distributed lock interface.

```java
public interface DistributedLock {

	/**
	 * Lock type
	 *
	 * @return Lock type
	 */
	String lockType();

	/**
	 * Lock (blocking)
	 *
	 * @param key Lock object
	 */
	boolean lock(String key);

	/**
	 * Lock (block until timeout)
	 *
	 * @param key      Lock object
	 * @param waitTime Wait time
	 * @param timeUnit Time unit
	 * @return Whether locking is successful
	 */
	boolean lock(String key, int waitTime, TimeUnit timeUnit);

	/**
	 * Unlock
	 *
	 * @param key Lock object
	 */
	void unlock(String key);
}
```

Implement the interface using Jedis.

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
	 * Lock type
	 *
	 * @return Lock type
	 */
	@Override
	public String lockType() {
		return DistributedLockType.JEDIS.name();
	}

	/**
	 * Blocking lock
	 *
	 * @param key Lock object
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
	 * Lock
	 *
	 * @param key      Lock object
	 * @param waitTime Wait time
	 * @param timeUnit Time unit
	 * @return Whether locking is successful
	 */
	@Override
	public boolean lock(@NonNull String key, int waitTime, TimeUnit timeUnit) {
		log.warn("Jedis create lock '{}' not support waitTime", key);
		return lock(key);
	}

	/**
	 * Unlock
	 *
	 * @param key Lock object
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

Implement the interface using Redisson.

```java
@RequiredArgsConstructor
@Slf4j
public class RedissonDistributedLock implements DistributedLock {

	private static final TransmittableThreadLocal<RLock> threadLocal = new TransmittableThreadLocal<>();

	private final RedissonClient redissonClient;

	/**
	 * Lock type
	 *
	 * @return Lock type
	 */
	@Override
	public String lockType() {
		return DistributedLockType.REDISSON.name();
	}

	/**
	 * Blocking lock
	 *
	 * @param key Lock object
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
	 * Lock
	 *
	 * @param key      Lock object
	 * @param waitTime Wait time
	 * @param timeUnit Time unit
	 * @return Whether locking is successful
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
	 * Unlock
	 *
	 * @param key Lock object
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

Implement the interface using Zookeeper.

```java
@RequiredArgsConstructor
@Slf4j
public class ZookeeperDistributedLock implements DistributedLock {

	private static final TransmittableThreadLocal<String> threadLocal = new TransmittableThreadLocal<>();

	private static final byte[] EMPTY_DATA = new byte[0];

	private final ZooKeeper zooKeeper;

	/**
	 * Lock type
	 *
	 * @return Lock type
	 */
	@Override
	public String lockType() {
		return DistributedLockType.ZOOKEEPER.name();
	}

	/**
	 * Blocking lock
	 *
	 * @param key Lock object
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
	 * Lock
	 *
	 * @param key      Lock object
	 * @param waitTime Wait time
	 * @param timeUnit Time unit
	 * @return Whether locking is successful
	 */
	@Override
	public boolean lock(@NonNull String key, int waitTime, TimeUnit timeUnit) {
		log.warn("Zookeeper create lock '{}' not support waitTime", key);
		return lock(key);
	}

	/**
	 * Unlock
	 *
	 * @param key Lock object
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

Implement the interface using Curator.

```java
@RequiredArgsConstructor
@Slf4j
public class CuratorDistributedLock implements DistributedLock {

	private static final TransmittableThreadLocal<InterProcessMutex> threadLocal = new TransmittableThreadLocal<>();

	private final CuratorFramework curatorFramework;

	/**
	 * Lock type
	 *
	 * @return Lock type
	 */
	@Override
	public String lockType() {
		return DistributedLockType.CURATOR.name();
	}

	/**
	 * Blocking lock
	 *
	 * @param key Lock object
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
	 * Lock
	 *
	 * @param key      Lock object
	 * @param waitTime Wait time
	 * @param timeUnit Time unit
	 * @return Whether locking is successful
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
	 * Unlock
	 *
	 * @param key Lock object
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

Put the concrete implementation into Spring Boot management.

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

When the project is configured with `distributed-lock.redisson.enabled=true`, Redisson is enabled as the underlying implementation of the distributed lock.

```yaml
distributed-lock:
  redisson:
    enabled: true # Enable Redisson as the underlying implementation of distributed locks

spring:
  redis:
    password: demo@123
    timeout: 5000
    database: 1
    host: localhost
    port: 6379
```

When the project is configured with `distributed-lock.curator.enabled=true`, Curator is enabled as the underlying implementation of the distributed lock.

```yaml
distributed-lock:
  curator:
    enabled: true # Enable Curator as the underlying implementation of distributed locks

spring:
  cloud:
  	zookeeper:
	  enabled: true
	  connectString: localhost:2181
```

Business code only needs to import the `DistributedLock` interface and call the `lock` and `unlock` methods to complete locking and unlocking in distributed scenarios.

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

# Output

Through API encapsulation, the tedious coding work of distributed locks for business projects is simplified, and development efficiency is improved.

The code involved in this article is completely open source. Interested partners can check [eden-distributed-lock](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-solutions/eden-distributed-lock) and [eden-distributed-lock-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-distributed-lock-spring-boot-starter).
