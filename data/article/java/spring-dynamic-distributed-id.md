---
title: Spring Boot Implementation of Extensible Distributed ID Generator
date: 2024-02-02
description: Encapsulate generic interfaces, shield API details, and manage based on Spring Boot automatic assembly.
tags:
  - Extension Point
  - Spring
  - Spring Boot
  - Distributed ID
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# Background

In complex distributed systems, it is often necessary to uniquely identify large amounts of data and messages. The article by the Meituan technical team introduced two schemes for the Leaf distributed ID generation system: the `Leaf-snowflake` scheme and the `Leaf-segment` scheme.

The Leaf-snowflake scheme uses the open-source Snowflake algorithm from Twitter and optimizes it using Zookeeper persistent sequential nodes, as shown in the figure below.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-distributed-uid-leaf-snowflake.png)

The Leaf-segment scheme is based on database implementation. It obtains the value of a batch of incremental number segments each time, and then goes to the database to obtain a new number segment after using it up. It can generate trend-increasing IDs, and the ID numbers are calculable, so it is not suitable for order ID generation scenarios (it is easy for competitors to calculate the order volume of a day). The relevant principles are shown in the figure below.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-distributed-uid-leaf-segment.png)

Since the Leaf distributed ID generation system is designed for independent deployment and accessed by various systems, if it is maintained improperly, it is easy to bring down the whole system. I think Leaf can be transformed into a pluggable component and hosted by Spring Boot Starter for automatic assembly. In addition, there are also open-source components in the industry such as Didi TinyId and Baidu UidGenerator. It is best to design it as a general ID generator, where the underlying implementation can be switched arbitrarily and is transparent to the business.

# Goal

Encapsulate generic interfaces, shield API details, and manage based on Spring Boot automatic assembly.

# Implementation

Since there are two distributed ID generation schemes: `Segment Generator` and `Snowflake Generator`, separate interfaces need to be defined.

First, define the distributed ID segment generator interface.

```java
public interface SegmentGenerator {

	/**
	 * Get ID from segment
	 *
	 * @return Segment
	 */
	long nextId();
}
```

Migrate the code of the Leaf segment generator. Since the official source code depends on manually creating data tables, I improved it on this basis and used the `Liquibase` component to implement automated table creation and version management. The code snippet is as follows:

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

The other code is not the focus of this article, and the link to the entire source code will be released at the end of the article later.

Okay, next design the Snowflake generator interface.

```java
public interface SnowflakeGenerator {

	/**
	 * Get ID
	 *
	 * @return ID
	 */
	long nextId();
}
```

The corresponding Snowflake algorithm code implementation.

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

The difference from Twitter is that the `SnowflakeCoordinator` is introduced.

```java
@SPI("zookeeper")
public interface SnowflakeCoordinator {

	/**
	 * Get workerId
	 *
	 * @return workerId
	 */
	long getWorkerId();

	/**
	 * Snowflake coordinator config
	 *
	 * @param config Snowflake coordinator config
	 * @return this
	 */
	SnowflakeCoordinator config(SnowflakeGeneratorConfig config);

	/**
	 * Set app info
	 *
	 * @param app App info
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
	 * Snowflake coordinator config
	 *
	 * @param config Snowflake coordinator config
	 * @return this
	 */
	@Override
	public SnowflakeCoordinator config(SnowflakeGeneratorConfig config) {
		this.config = config;
		return this;
	}

	/**
	 * Set app info
	 *
	 * @param app App info
	 */
	@Override
	public SnowflakeCoordinator app(App app) {
		this.app = app;
		return this;
	}

	/**
	 * Start CuratorFramework
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
	 * Create Zookeeper sequential node
	 *
	 * @return The sequential node of Zookeeper returned after creation is successful
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
	 * Update local workerId to ensure that the machine starts normally when it restarts
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
	 * Check endpoint reporting time
	 * <br/> The time of this node cannot be less than the time of the last report
	 *
	 * @param zkNode Zookeeper node
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
	 * Report endpoint time regularly
	 *
	 * @param zkNode Zookeeper node
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
		}, 1L, 3L, TimeUnit.SECONDS); // Report data every 3 seconds

	}
}
```

The encapsulation of the two schemes is completed. Next, put them into Spring Boot automatic assembly management.

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

After introducing our custom Spring Boot Starter component into the business project, set the following content in the configuration file.

```yaml
distributed-uid:
  snowflake-generator:
    enabled: false # Enable Snowflake generator
    coordinator:
      type: zookeeper
      zookeeper:
        connect-string: localhost:2181
  segment-generator:
    enabled: true # Enable database segment generator
    liquibase:
      username: sa
      password: demo
      url: jdbc:h2:mem:db;DB_CLOSE_ON_EXIT=TRUE
      driver-class-name: org.h2.Driver
```

Start the project, and you can see in the log console that the Leaf table data is automatically initialized.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-distributed-uid-leaf-segment-liquibase.png)

Considering that the team uses MyBatis-Plus involving ID generation, I also extended the relevant implementation through `com.baomidou.mybatisplus.core.incrementer.IdentifierGenerator`.

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

The business project configuration is as follows.

```yaml
mybatis-plus:
  id-generator:
    type: segment # Set to snowflake to enable Snowflake algorithm, set to segment to enable database issuance
```

In addition to Leaf, the integration of other components can also be extended, which will not be expanded here.

# Output

Through API encapsulation, the tedious coding work of distributed ID generation for business projects is simplified, and development efficiency is improved.

The code involved in this article is completely open source. Interested partners can check [eden-distributed-uid](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-solutions/eden-distributed-uid) and [eden-distributed-lock-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-distributed-uid-spring-boot-starter).
