---
title: Spring Boot 实现可扩展的分布式ID生成器
date: 2024-02-02
description: 封装通用接口，屏蔽 API 细节，基于 Spring Boot 自动装配管理。
tags:
  - 扩展点
  - Spring
  - Spring Boot
  - 分布式ID
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# 背景

在复杂的分布式系统中，往往需要对大量的数据和消息进行唯一标识。美团技术团队的文章中介绍了 Leaf 分布式ID生成系统的两种方案：`Leaf-snowflake` 方案和 `Leaf-segment` 方案。

Leaf-snowflake 方案沿用 Twitter 开源的雪花算法，在原有的基础上使用 Zookeeper 持久顺序节点进行优化，如下图。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-distributed-uid-leaf-snowflake.png)

Leaf-segment 方案基于数据库实现，每次获取一批递增号段的值，用完之后再去数据库获取新的号段，可以生成趋势递增的 ID，同时 ID 号是可计算的，因此不适用于订单 ID 生成场景（容易被竞争对手算出一天的订单量），相关原理如下图。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-distributed-uid-leaf-segment.png)

由于 Leaf 分布式ID生成系统设计为独立部署，由各系统接入使用，但稍微维护不当，容易搞垮整个系统。笔者认为，可以将 Leaf 改造为插件化组件，托管到 Spring Boot Starter 自动装配。除此之外，业界开源的组件也有滴滴 TinyId、百度 UidGenerator 等，最好是设计为通用的 ID 生成器，底层实现任意切换，对业务无感知。

# 目标

封装通用接口，屏蔽 API 细节，基于 Spring Boot 自动装配管理。

# 实现

由于分布式 ID 生成方案有`号段生成器`和`雪花算法生成器`这两种，需要分别定义接口。
 
首先，定义分布式 ID 号段生成器接口。

```java
public interface SegmentGenerator {

	/**
	 * 从号段获取ID
	 *
	 * @return 号段
	 */
	long nextId();
}
```

将 Leaf 号段生成器的代码迁移过来。由于官方源码依赖于手动创建数据表，笔者在这个基础上进行改良，使用 `Liquibase` 组件实现自动化创建库表和版本管理。代码片段如下：

```java
@Slf4j
public class LeafSegmentGenerator implements SegmentGenerator {

	private static final long LIQUIBASE_SLOWNESS_THRESHOLD = 5;

	private final SegmentGeneratorConfig config;

	private final LeafAllocDAO leafAllocDAO;

	private final ExecutorService executorService = new ThreadPoolExecutor(5, Integer.MAX_VALUE, 60L,
		TimeUnit.SECONDS, new SynchronousQueue<>(), new UpdateThreadFactory());

	private final Map<String, SegmentBuffer> cache = new ConcurrentHashMap<>();

	private final boolean initialized;

	public LeafSegmentGenerator(SegmentGeneratorConfig config, DataSource dataSource) {
		this.config = config;
		if (config.getLiquibase().isEnabled()) {
			this.initDb(dataSource);
		}
		this.leafAllocDAO = new LeafAllocDAO(dataSource);
		this.updateCacheFromDb();
		this.initialized = true;
		this.updateCacheFromDbAtEveryMinute();
	}

	@Override
	public long nextId() {
		if (!initialized) {
			throw new SegmentGeneratorException("Database segment generator not initialized");
		}
		String key = config.getTenant();
		if (!cache.containsKey(key)) {
			throw new SegmentGeneratorException("Database segment cache contains key '" + key + "', please check database");
		}
		SegmentBuffer buffer = cache.get(key);
		if (!buffer.isInitialized()) {
			synchronized (buffer) {
				if (!buffer.isInitialized()) {
					try {
						updateSegmentFromDb(key, buffer.getCurrent());
						log.debug("Initialize buffer and update leaf key {} {} from db", key, buffer.getCurrent());
						buffer.setInitialized(true);
					} catch (Exception e) {
						log.warn("Initialize buffer {} catch exception", buffer.getCurrent(), e);
					}
				}
			}
		}
		return getIdFromSegmentBuffer(cache.get(key));
	}

	private void initDb(DataSource dataSource) {
		SpringLiquibase liquibase = buildLiquibase(dataSource);
		StopWatch watch = new StopWatch();
		watch.start();
		try {
			liquibase.afterPropertiesSet();
		} catch (LiquibaseException e) {
			throw new SegmentGeneratorException("Leaf liquibase has initialized your database error", e);
		}
		watch.stop();
		log.debug("Leaf liquibase has initialized your database in {} ms", watch.getTotalTimeMillis());
		if (watch.getTotalTimeMillis() > LIQUIBASE_SLOWNESS_THRESHOLD * 1000L) {
			log.warn("Leaf liquibase took more than {} seconds to initialized your database!", LIQUIBASE_SLOWNESS_THRESHOLD);
		}
	}

	private SpringLiquibase buildLiquibase(DataSource dataSource) {
		SpringLiquibase liquibase = new SpringLiquibase();
		liquibase.setDataSource(dataSource);
		liquibase.setChangeLog(this.config.getLiquibase().getChangeLog());
		liquibase.setClearCheckSums(this.config.getLiquibase().isClearChecksums());
		liquibase.setContexts(this.config.getLiquibase().getContexts());
		liquibase.setDefaultSchema(this.config.getLiquibase().getDefaultSchema());
		liquibase.setLiquibaseSchema(this.config.getLiquibase().getLiquibaseSchema());
		liquibase.setLiquibaseTablespace(this.config.getLiquibase().getLiquibaseTablespace());
		liquibase.setDatabaseChangeLogTable(this.config.getLiquibase().getDatabaseChangeLogTable());
		liquibase.setDatabaseChangeLogLockTable(this.config.getLiquibase().getDatabaseChangeLogLockTable());
		liquibase.setDropFirst(this.config.getLiquibase().isDropFirst());
		liquibase.setShouldRun(this.config.getLiquibase().isEnabled());
		liquibase.setLabels(this.config.getLiquibase().getLabels());
		liquibase.setChangeLogParameters(this.config.getLiquibase().getParameters());
		liquibase.setRollbackFile(this.config.getLiquibase().getRollbackFile());
		liquibase.setTestRollbackOnUpdate(this.config.getLiquibase().isTestRollbackOnUpdate());
		liquibase.setTag(this.config.getLiquibase().getTag());
		return liquibase;
	}

	private void updateCacheFromDb() {
		log.debug("Leaf update cache from db");
		try {
			List<String> dbTags = leafAllocDAO.getAllTags();
			if (dbTags == null || dbTags.isEmpty()) {
				return;
			}
			List<String> cacheTags = new ArrayList<String>(cache.keySet());
			Set<String> insertTagsSet = new HashSet<>(dbTags);
			Set<String> removeTagsSet = new HashSet<>(cacheTags);
			for (String tag : cacheTags) {
				insertTagsSet.remove(tag);
			}
			for (String tag : insertTagsSet) {
				SegmentBuffer buffer = new SegmentBuffer();
				buffer.setKey(tag);
				Segment segment = buffer.getCurrent();
				segment.setValue(new AtomicLong(0));
				segment.setMax(0);
				segment.setStep(0);
				cache.put(tag, buffer);
				log.debug("Leaf add tag {} from db to IdCache", tag);
			}
			for (String tag : dbTags) {
				removeTagsSet.remove(tag);
			}
			for (String tag : removeTagsSet) {
				cache.remove(tag);
				log.debug("Leaf remove tag {} from IdCache", tag);
			}
		} catch (Exception e) {
			log.warn("Leaf update cache from db exception", e);
		}
	}

	private void updateCacheFromDbAtEveryMinute() {
		ScheduledExecutorService service = Executors.newSingleThreadScheduledExecutor(r -> {
			Thread t = new Thread(r);
			t.setName("leaf-check-id-cache-thread");
			t.setDaemon(true);
			return t;
		});
		service.scheduleWithFixedDelay(this::updateCacheFromDb, 60, 60, TimeUnit.SECONDS);
	}

	private void updateSegmentFromDb(String key, Segment segment) {
		SegmentBuffer buffer = segment.getBuffer();
		LeafAlloc leafAlloc;
		if (!buffer.isInitialized()) {
			leafAlloc = leafAllocDAO.updateMaxIdAndGetLeafAlloc(key);
			buffer.setStep(leafAlloc.getStep());
			buffer.setMinStep(leafAlloc.getStep());
		} else if (buffer.getUpdateTimestamp() == 0) {
			leafAlloc = leafAllocDAO.updateMaxIdAndGetLeafAlloc(key);
			buffer.setUpdateTimestamp(System.currentTimeMillis());
			buffer.setStep(leafAlloc.getStep());
			buffer.setMinStep(leafAlloc.getStep());
		} else {
			long duration = System.currentTimeMillis() - buffer.getUpdateTimestamp();
			int nextStep = buffer.getStep();
			if (duration < config.getSegmentTtl()) {
				if (config.getMaxStep() >= nextStep * 2) {
					nextStep = nextStep * 2;
				}
			} else if (duration >= config.getSegmentTtl() * 2) {
				nextStep = nextStep / 2 >= buffer.getMinStep() ? nextStep / 2 : nextStep;
			}
			log.debug("leafKey[{}], step[{}], duration[{}mins], nextStep[{}]", key, buffer.getStep(), String.format("%.2f", ((double) duration / (1000 * 60))), nextStep);
			LeafAlloc temp = new LeafAlloc();
			temp.setKey(key);
			temp.setStep(nextStep);
			leafAlloc = leafAllocDAO.updateMaxIdByCustomStepAndGetLeafAlloc(temp);
			buffer.setUpdateTimestamp(System.currentTimeMillis());
			buffer.setStep(nextStep);
			buffer.setMinStep(leafAlloc.getStep());
		}
		long value = leafAlloc.getMaxId() - buffer.getStep();
		segment.getValue().set(value);
		segment.setMax(leafAlloc.getMaxId());
		segment.setStep(buffer.getStep());
	}

	private long getIdFromSegmentBuffer(final SegmentBuffer buffer) {
		while (true) {
			buffer.rLock().lock();
			try {
				final Segment segment = buffer.getCurrent();
				if (!buffer.isNextReady() && (segment.getIdle() < 0.9 * segment.getStep())
					&& buffer.getThreadRunning().compareAndSet(false, true)) {
					executorService.execute(() -> {
						Segment next = buffer.getSegments()[buffer.nextPos()];
						boolean updateOk = false;
						try {
							updateSegmentFromDb(buffer.getKey(), next);
							updateOk = true;
							log.info("Leaf update segment {} from db {}", buffer.getKey(), next);
						} catch (Exception e) {
							log.error("Leaf update segment {} from db {} error", buffer.getKey(), e);
						} finally {
							if (updateOk) {
								buffer.wLock().lock();
								buffer.setNextReady(true);
								buffer.getThreadRunning().set(false);
								buffer.wLock().unlock();
							} else {
								buffer.getThreadRunning().set(false);
							}
						}
					});
				}
				long value = segment.getValue().getAndIncrement();
				if (value < segment.getMax()) {
					return value;
				}
			} finally {
				buffer.rLock().unlock();
			}
			waitAndSleep(buffer);
			buffer.wLock().lock();
			try {
				final Segment segment = buffer.getCurrent();
				long value = segment.getValue().getAndIncrement();
				if (value < segment.getMax()) {
					return value;
				}
				if (buffer.isNextReady()) {
					buffer.switchPos();
					buffer.setNextReady(false);
				} else {
					throw new SegmentGeneratorException("Both two segments in '" + buffer + "' are not ready!");
				}
			} finally {
				buffer.wLock().unlock();
			}
		}
	}

	private void waitAndSleep(SegmentBuffer buffer) {
		int roll = 0;
		while (buffer.getThreadRunning().get()) {
			roll += 1;
			if (roll > 10000) {
				try {
					TimeUnit.MILLISECONDS.sleep(10);
					break;
				} catch (InterruptedException e) {
					log.warn("Thread {} Interrupted", Thread.currentThread().getName());
					break;
				}
			}
		}
	}

	public static class UpdateThreadFactory implements ThreadFactory {

		private static int threadInitNumber = 0;

		private static synchronized int nextThreadNum() {
			return threadInitNumber++;
		}

		@Override
		public Thread newThread(Runnable r) {
			return new Thread(r, "leaf-segment-update-" + nextThreadNum());
		}
	}
}
```

关于其他代码不是本文讨论的重点，稍后在文章尾部放出整个源码链接。

好了，接下来设计雪花算法生成器接口。

```java
public interface SnowflakeGenerator {

	/**
	 * 获取ID
	 *
	 * @return ID
	 */
	long nextId();
}
```

对应的雪花算法代码实现。

```java
public class LeafSnowflakeGenerator implements SnowflakeGenerator {

	private static final long workerIdBits = 10L;

	private static final long maxWorkerId = ~(-1L << workerIdBits);

	private static final long sequenceBits = 12L;

	private static final long workerIdShift = sequenceBits;

	private static final long timestampLeftShift = sequenceBits + workerIdBits;

	private static final long sequenceMask = ~(-1L << sequenceBits);

	private static final Random RANDOM = new Random();

	private final long workerId;

	private long sequence = 0L;

	private long lastTimestamp = -1L;

	private final long twepoch;

	public LeafSnowflakeGenerator(SnowflakeGeneratorConfig config, App app) {
		this.twepoch = config.getTwepoch();
		AssertUtils.isTrue(timeGen() > twepoch, "Snowflake not support twepoch gt currentTime");

		this.workerId = SnowflakeCoordinatorBuilder.build(config, app).getWorkerId();
		AssertUtils.isTrue(workerId >= 0 && workerId <= maxWorkerId, "Snowflake worker id must between 0 and 1023");
	}

	@Synchronized
	@Override
	public long nextId() {
		long timestamp = timeGen();
		if (timestamp < lastTimestamp) {
			long offset = lastTimestamp - timestamp;
			if (offset <= 5) {
				try {
					wait(offset << 1);
					timestamp = timeGen();
					if (timestamp < lastTimestamp) {
						throw new SnowflakeGeneratorException("Snowflake last timestamp gt currentTime");
					}
				} catch (InterruptedException e) {
					throw new SnowflakeGeneratorException("Snowflake next id wait interrupted");
				}
			} else {
				throw new SnowflakeGeneratorException("Snowflake last timestamp offset gt 5");
			}
		}
		if (lastTimestamp == timestamp) {
			sequence = (sequence + 1) & sequenceMask;
			if (sequence == 0) {
				sequence = RANDOM.nextInt(100);
				timestamp = tillNextMillis(lastTimestamp);
			}
		} else {
			sequence = RANDOM.nextInt(100);
		}
		lastTimestamp = timestamp;
		return ((timestamp - twepoch) << timestampLeftShift) | (workerId << workerIdShift) | sequence;
	}

	private long tillNextMillis(long lastTimestamp) {
		long timestamp = timeGen();
		while (timestamp <= lastTimestamp) {
			timestamp = timeGen();
		}
		return timestamp;
	}

	private long timeGen() {
		return System.currentTimeMillis();
	}
}
```

和 Twitter 不同的地方是，引入了 `SnowflakeCoordinator` 雪花算法协调器。

```java
@SPI("zookeeper")
public interface SnowflakeCoordinator {

	/**
	 * 获取 workerId
	 *
	 * @return workerId
	 */
	long getWorkerId();

	/**
	 * 雪花算法协调器配置
	 *
	 * @param config 雪花算法协调器配置
	 * @return this
	 */
	SnowflakeCoordinator config(SnowflakeGeneratorConfig config);

	/**
	 * 设置应用信息
	 *
	 * @param app 应用信息
	 */
	SnowflakeCoordinator app(App app);
}

@Slf4j
public class ZookeeperSnowflakeCoordinator implements SnowflakeCoordinator {

	private static final String LEAF_SCHEDULE_NAME = "leaf-zookeeper-schedule";

	private static final String ZK_PATH_PATTERN = "/leaf/snowflake/{}/node";

	private static final String NODE_PREFIX_PATTERN = ZK_PATH_PATTERN + "/{}:{}-";

	private static final String CONF_PATH_PATTERN = System.getProperty("java.io.tmpdir") + "/leaf/{}/{}/worker-id.properties";

	private volatile CuratorFramework curatorFramework;

	private SnowflakeGeneratorConfig config;

	private App app;

	private long lastUpdateTime;

	@Override
	public long getWorkerId() {
		this.startCurator();
		int workerId = 0;
		String zkPath = MessageFormatUtils.format(ZK_PATH_PATTERN, config.getName());
		String zkNode;
		try {
			Stat stat = curatorFramework.checkExists().forPath(zkPath);
			if (stat == null) {
				zkNode = createNode();
			} else {
				Map<String, Integer> nodeIds = Maps.newHashMap();
				Map<String, String> nodes = Maps.newHashMap();
				List<String> keys = curatorFramework.getChildren().forPath(zkPath);
				for (String key : keys) {
					String[] nodeKey = key.split("-");
					nodeIds.put(nodeKey[0], Integer.parseInt(nodeKey[1]));
					nodes.put(nodeKey[0], key);
				}
				String listenAddress = app.getIp() + ":" + app.getPort();
				Integer nodeWorkerId = nodeIds.get(listenAddress);
				if (nodeWorkerId != null) {
					zkNode = zkPath + "/" + nodes.get(listenAddress);
					workerId = nodeWorkerId;
					checkEndpointTimeStamp(zkNode);
				} else {
					zkNode = createNode();
					String[] nodeKey = zkNode.split("-");
					workerId = Integer.parseInt(nodeKey[1]);
				}
			}
			this.updateLocalWorkerId(workerId);
			this.scheduledEndpoint(zkNode);
		} catch (Exception e) {
			throw new SnowflakeGeneratorException(e.getMessage(), e);
		}
		return workerId;
	}

	/**
	 * 雪花算法协调器配置
	 *
	 * @param config 雪花算法协调器配置
	 * @return this
	 */
	@Override
	public SnowflakeCoordinator config(SnowflakeGeneratorConfig config) {
		this.config = config;
		return this;
	}

	/**
	 * 设置应用信息
	 *
	 * @param app 应用信息
	 */
	@Override
	public SnowflakeCoordinator app(App app) {
		this.app = app;
		return this;
	}

	/**
	 * 启动 CuratorFramework
	 */
	private void startCurator() {
		if (curatorFramework == null) {
			synchronized (this) {
				if (curatorFramework == null) {
					curatorFramework = CuratorFrameworkFactory.builder()
						.connectString(config.getCoordinator().getZookeeper().getConnectString())
						.retryPolicy(new RetryUntilElapsed(1000, 4))
						.connectionTimeoutMs(10000)
						.sessionTimeoutMs(6000)
						.build();
				}
			}
		}
		if (curatorFramework.getState() != CuratorFrameworkState.STARTED) {
			curatorFramework.start();
		}
	}

	/**
	 * 创建 Zookeeper 顺序节点
	 *
	 * @return 创建成功后返回的 Zookeeper 的顺序节点
	 */
	private String createNode() {
		String prefix = MessageFormatUtils.format(NODE_PREFIX_PATTERN, config.getName(),
			app.getIp(), app.getPort());
		String endpoint = Endpoint.build(app.getIp(), app.getPort());
		try {
			return curatorFramework.create()
				.creatingParentsIfNeeded()
				.withMode(CreateMode.PERSISTENT_SEQUENTIAL)
				.forPath(prefix, endpoint.getBytes());
		} catch (Exception e) {
			throw new SnowflakeGeneratorException("Create zookeeper node '" + prefix + "' failed", e);
		}
	}

	/**
	 * 更新本地 workerId，确保机器重启时能够正常启动
	 *
	 * @param workerId
	 * @throws IOException
	 */
	private void updateLocalWorkerId(int workerId) throws IOException {
		String pathname = MessageFormatUtils.format(CONF_PATH_PATTERN, config.getName(), workerId);
		File leafConfFile = new File(pathname);
		if (leafConfFile.exists()) {
			log.info("Update local config file '{}' with worker id is {}", pathname, workerId);
			FileUtils.writeStringToFile(leafConfFile, "workerId=" + workerId, Charset.defaultCharset(), false);
		} else {
			if (!leafConfFile.getParentFile().exists()) {
				leafConfFile.getParentFile().mkdirs();
			}
			log.info("Initialize local config file '{}' with worker id is {}", pathname, workerId);
			if (leafConfFile.createNewFile()) {
				FileUtils.writeStringToFile(leafConfFile, "workerId=" + workerId, Charset.defaultCharset(), false);
				log.info("Write local file cache worker id is  {}", workerId);
			}
		}
	}

	/**
	 * 检查节点上报时间
	 * <br/> 该节点的时间不能小于最后一次上报的时间
	 *
	 * @param zkNode Zookeeper 节点
	 */
	private void checkEndpointTimeStamp(String zkNode) {
		byte[] bytes;
		try {
			bytes = curatorFramework.getData().forPath(zkNode);
		} catch (Exception e) {
			throw new SnowflakeGeneratorException("Get zookeeper node '" + zkNode + "' data error");
		}
		Endpoint endPoint = Endpoint.parse(new String(bytes));
		if (endPoint.getTimestamp() > System.currentTimeMillis()) {
			throw new SnowflakeGeneratorException("Check endpoint timestamp invalid");
		}
	}

	/**
	 * 定时上报节点时间
	 *
	 * @param zkNode Zookeeper 节点
	 */
	private void scheduledEndpoint(String zkNode) {
		Executors.newSingleThreadScheduledExecutor(r -> {
			Thread thread = new Thread(r, LEAF_SCHEDULE_NAME);
			thread.setDaemon(true);
			return thread;
		}).scheduleWithFixedDelay(() -> {
			if (System.currentTimeMillis() < lastUpdateTime) {
				return;
			}
			try {
				curatorFramework.setData().forPath(zkNode, Endpoint.build(app.getIp(), app.getPort()).getBytes());
			} catch (Exception e) {
				throw new SnowflakeGeneratorException("Scheduled endpoint timestamp error", e);
			}
			lastUpdateTime = System.currentTimeMillis();
		}, 1L, 3L, TimeUnit.SECONDS); // 每 3 秒上报一次数据

	}
}
```

两种方案封装完成，接下来放到 Spring Boot 自动装配管理。

```java
@EnableConfigurationProperties(DistributedUIDProperties.class)
@RequiredArgsConstructor
@Slf4j
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Configuration(proxyBeanMethods = false)
public class DistributedUIDAutoConfiguration {

	private final DistributedUIDProperties properties;

	@ConditionalOnProperty(prefix = "distributed-uid.snowflake-generator", name = "enabled", havingValue = true)
	@ConditionalOnMissingBean
	@Bean
	public SnowflakeGenerator snowflakeGenerator(@Value(SpringProperties.NAME_PATTERN) String applicationName,
												 ServerProperties serverProperties) {
		log.debug("Autowired SnowflakeGenerator");
		SnowflakeGeneratorConfig config = properties.getSnowflakeGenerator();
		config.setName(applicationName);
		return SnowflakeGeneratorHelper.snowflakeGenerator(config,
			App.builder().ip(IpConfigUtils.getIpAddress()).port(serverProperties.getPort()).build());
	}

	@ConditionalOnProperty(prefix = "distributed-uid.segment-generator", name = "enabled", havingValue = true)
	@ConditionalOnMissingBean
	@Bean
	public SegmentGenerator segmentGenerator(DataSource dataSource) {
		log.debug("Autowired SegmentGenerator");
		return SegmentGeneratorHelper.segmentGenerator(properties.getSegmentGenerator(), dataSource);
	}
}

@Setter
@Getter
@ConfigurationProperties(prefix = "distributed-uid")
public class DistributedUIDProperties {

	private final SnowflakeGeneratorConfig snowflakeGenerator = new SnowflakeGeneratorConfig();

	private final SegmentGeneratorConfig segmentGenerator = new SegmentGeneratorConfig();
}
```

业务项目引入我们自定义的 Spring Boot Starter 组件后，在配置文件设置以下内容。

```yaml
distributed-uid:
  snowflake-generator: 
    enabled: false # 开启雪花算法生成器
    coordinator:
      type: zookeeper
      zookeeper:
        connect-string: localhost:2181
  segment-generator:
    enabled: true # 开启数据库号段生成器
    liquibase:
      username: sa
      password: demo
      url: jdbc:h2:mem:db;DB_CLOSE_ON_EXIT=TRUE
      driver-class-name: org.h2.Driver
```

启动项目，可以在日志控制台看出 Leaf 表数据自动初始化。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-distributed-uid-leaf-segment-liquibase.png)

考虑团队使用 MyBatis-Plus 涉及到 ID 的生成，笔者也扩展了相关实现，通过 `com.baomidou.mybatisplus.core.incrementer.IdentifierGenerator` 扩展。

```java
@AutoConfigureAfter(MybatisPlusAutoConfiguration.class)
@EnableConfigurationProperties({MybatisPlusIdGeneratorProperties.class})
@Slf4j
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Configuration(proxyBeanMethods = false)
public class MybatisPlusIdGeneratorAutoConfiguration {

	@ConditionalOnProperty(
		prefix = MybatisPlusIdGeneratorProperties.PREFIX,
		name = MybatisPlusIdGeneratorProperties.TYPE,
		havingValue = MybatisPlusIdGeneratorProperties.SNOWFLAKE
	)
	@Bean
	public SnowflakeIdentifierGenerator snowflakeIdentifierGenerator(SnowflakeGenerator snowflakeGenerator) {
		return new SnowflakeIdentifierGenerator(snowflakeGenerator);
	}

	@ConditionalOnProperty(
		prefix = MybatisPlusIdGeneratorProperties.PREFIX,
		name = MybatisPlusIdGeneratorProperties.TYPE,
		havingValue = MybatisPlusIdGeneratorProperties.SEGMENT
	)
	@Bean
	public SegmentIdentifierGenerator segmentIdentifierGenerator(SegmentGenerator segmentGenerator) {
		return new SegmentIdentifierGenerator(segmentGenerator);
	}
}

@Data
@ConfigurationProperties(prefix = MybatisPlusIdGeneratorProperties.PREFIX)
public class MybatisPlusIdGeneratorProperties {

	public static final String PREFIX = "mybatis-plus.id-generator";

	public static final String TYPE = "type";

	public static final String SNOWFLAKE = "snowflake";

	public static final String SEGMENT = "segment";

	private String type;
}

@RequiredArgsConstructor
public class SegmentIdentifierGenerator implements IdentifierGenerator {

	private final SegmentGenerator segmentGenerator;

	@Override
	public Long nextId(Object entity) {
		return segmentGenerator.nextId();
	}
}

@RequiredArgsConstructor
public class SnowflakeIdentifierGenerator implements IdentifierGenerator {

	private final SnowflakeGenerator snowflakeGenerator;

	@Override
	public Long nextId(Object entity) {
		return snowflakeGenerator.nextId();
	}
}
```

业务项目配置如下内容即可使用。

```yaml
mybatis-plus:
  id-generator:
    type: segment # 设置为 snowflake 表示开启雪花算法，设置为 segment 表示基于数据库发号
```

除了 Leaf，也可以扩展其他组件的集成，具体就不展开了。

# 产出

通过 API 封装，简化了业务项目对分布式 ID 生成的繁琐编码工作，提高开发效率。

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-distributed-uid](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-solutions/eden-distributed-uid) 和 [eden-distributed-lock-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-distributed-uid-spring-boot-starter)。