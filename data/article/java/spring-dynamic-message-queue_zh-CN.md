---
title: Spring Boot 实现可扩展的消息队列
date: 2024-02-16
description: 在复杂的分布式系统中，消息队列（如 RocketMQ、Kafka、RabbitMQ）常用于优化系统性能。
tags:
  - 扩展点
  - Spring
  - Spring Boot
  - 消息队列
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# 背景

在复杂的分布式系统中，消息队列（如 `RocketMQ`、`Kafka`、`RabbitMQ`）常用于优化系统性能。然而，直接在代码中引入这些消息队列的 API 会导致系统与特定消息队列的强耦合，后续难以切换其他消息队列组件。虽然 `Spring Cloud Stream` 提供了一种抽象层，但其引入了复杂的概念（如绑定器、通道、处理器等），且与低版本的 `Spring Boot` 不兼容。

为了解决这些问题，我们决定开发一个简洁、可切换的 MQ 组件，保留原生配置的同时，屏蔽底层 API 细节，并通过 `Spring Boot` 自动装配进行管理。

# 目标

1. 封装通用接口：提供统一的接口，屏蔽底层消息队列的 API 细节。
2. 保留原生配置：支持 `RocketMQ`、`Kafka` 等消息队列的原生配置。
3. 做到开箱即用：通过 `Spring Boot` 的自动装配机制，简化配置和集成。

# 实现

## 消息模型设计

首先，定义一个通用的消息模型 `Message`，用于封装业务项目中生产和消费的消息内容。该模型兼容 RocketMQ 和 Kafka 的消息结构。

```java
@Accessors(chain = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@ToString
@Data
public class Message implements Serializable {

	/** 命名空间 */
	private String namespace;

	/** 主题 */
	private String topic;

	/** 分区/队列 */
	private Integer partition;

	/** 分区键 */
	private String key;

	/** 标签过滤 */
	private String tags;

	/** 消息体 */
	private String body;

	/** 延时等级 */
	@Builder.Default
	private Integer delayTimeLevel = 0;
}
```

## 消费者接口设计

定义 `MessageQueueConsumer` 接口，用于处理消息消费逻辑。通过 `@MessageQueueListener` 注解，可以配置消费参数，如主题、消费者组、消费线程等。

```java
public interface MessageQueueConsumer {

	/**
	 * 消费消息
	 *
	 * @param messages 消息报文
	 * @param ack 消息确认
	 */
	void consume(List<Message> messages, Acknowledgement ack);
}

@FunctionalInterface
public interface Acknowledgement {

	/**
	 * 提交
	 */
	void acknowledge();
}
```

定义 `@MessageQueueListener` 注解，用于配置消费者的行为，如消费主题、消费者组、消费模式、消息过滤等。

```java
@Component
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface MessageQueueListener {

	/**
	 * 消息队列类型
	 *
	 * @return 消息队列类型
	 */
	String type() default Strings.EMPTY;

	/**
	 * 设置消费者组
	 *
	 * @return 消费者组名
	 */
	String group() default Strings.EMPTY;

	/**
	 * 设置消息主题
	 *
	 * @return 消息主题
	 */
	String topic() default Strings.EMPTY;

	/**
	 * 从 Broker 端批量拉取消息大小
	 *
	 * @return 默认拉取 32 条消息
	 */
	int pullBatchSize() default 0;

	/**
	 * 上报 Broker 端的最大消费消息数，当拉取消息的大小大于消费的大小时，拆成多个线程并发处理
	 *
	 * @return 默认消费 1 条消息
	 */
	int consumeMessageBatchMaxSize() default 0;

	/**
	 * 最小消费线程
	 *
	 * @return 默认 8 个线程
	 */
	int consumeThreadMin() default 0;

	/**
	 * 最大消费线程
	 *
	 * @return 默认 64 个线程
	 */
	int consumeThreadMax() default 0;

	/**
	 * 消费超时
	 *
	 * @return 默认 15 分钟
	 */
	long consumeTimeout() default 0;

	/**
	 * 消费模式
	 *
	 * @return 默认并发消费，不保证顺序
	 */
	ConsumeMode consumeMode() default ConsumeMode.UNSET;

	/**
	 * 消息模式
	 *
	 * @return 默认集群模式
	 */
	MessageModel messageModel() default MessageModel.UNSET;

	/**
	 * 消息过滤类型
	 *
	 * @return 默认按 Tag 过滤
	 */
	MessageSelectorType selectorType() default MessageSelectorType.UNSET;

	/**
	 * 消息过滤规则
	 *
	 * @return 默认全模糊匹配
	 */
	String selectorExpression() default "*";

	/**
	 * 是否开启消息轨迹追踪
	 *
	 * @return 默认开启
	 */
	boolean enableMsgTrace() default true;
}
```

当我们设置启用 RocketMQ 时，通过 `RocketMQConsumer` 对 `MessageQueueListener` 注解进行配置解析，实现消息消费。

```java
@RequiredArgsConstructor
@Slf4j
public class RocketMQConsumer implements InitializingBean, DisposableBean, ApplicationContextAware {

	@Getter
	private final Map<String, DefaultMQPushConsumer> consumers = Maps.newConcurrentMap();

	private final RocketMQConfig rocketMQConfig;

	private final List<MessageQueueConsumer> messageQueueConsumers;

	private final Function<String, Boolean> matcher;

	private ApplicationContext applicationContext;

	@Override
	public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
		this.applicationContext = applicationContext;
	}

	@Override
	public void afterPropertiesSet() {
		log.debug("Initializing RocketMQConsumer");
		if (CollectionUtils.isEmpty(messageQueueConsumers)) {
			return;
		}
		for (MessageQueueConsumer messageQueueConsumer : messageQueueConsumers) {
			DefaultMQPushConsumer consumer;
			try {
				consumer = initRocketMQPushConsumer(messageQueueConsumer);
			} catch (MQClientException e) {
				throw new RuntimeException(e);
			}
			if (consumer == null) {
				continue;
			}

			try {
				consumer.start();
			} catch (MQClientException e) {
				log.error("RocketMQConsumer consume error: {}", e.getMessage(), e);
				throw new MessageConsumeException(e.getMessage());
			}
		}
	}

	@Override
	public void destroy() {
		log.debug("Destroy RocketMQConsumer");
		consumers.forEach((k, v) -> v.shutdown());
		consumers.clear();
	}

	private DefaultMQPushConsumer initRocketMQPushConsumer(MessageQueueConsumer messageQueueConsumer) throws MQClientException {
		Class<? extends MessageQueueConsumer> clazz = messageQueueConsumer.getClass();
		MessageQueueListener annotation = clazz.getAnnotation(MessageQueueListener.class);
		if (!matcher.apply(annotation.type())) {
			return null;
		}

		// 命名空间
		String namespace = null;
		if (StringUtils.isNotBlank(rocketMQConfig.getConsumer().getNamespace())) {
			namespace = rocketMQConfig.getConsumer().getNamespace();
		}

		// 主题
		String topic = null;
		if (StringUtils.isNotBlank(annotation.topic())) {
			topic = annotation.topic();
		} else if (StringUtils.isNotBlank(rocketMQConfig.getConsumer().getTopic())) {
			topic = rocketMQConfig.getConsumer().getTopic();
		}
		AssertUtils.notNull(topic, "PROP-REQUIRED-500", "rocketmq.consumer.topic");

		// 消费组
		String consumerGroup = null;
		if (StringUtils.isNotBlank(annotation.group())) {
			consumerGroup = annotation.group();
		} else if (StringUtils.isNotBlank(rocketMQConfig.getConsumer().getGroup())) {
			consumerGroup = rocketMQConfig.getConsumer().getGroup() + Strings.UNDERLINE + topic;
		}
		AssertUtils.notNull(consumerGroup, "PROP-REQUIRED-500", "rocketmq.consumer.group");

		// 初始化消费者
		Environment environment = this.applicationContext.getEnvironment();
		RPCHook rpcHook = RocketMQUtil.getRPCHookByAkSk(applicationContext.getEnvironment(),
			rocketMQConfig.getConsumer().getAccessKey(), rocketMQConfig.getConsumer().getSecretKey());
		boolean enableMsgTrace = annotation.enableMsgTrace();
		DefaultMQPushConsumer consumer;
		if (Objects.nonNull(rpcHook)) {
			consumer = new DefaultMQPushConsumer(namespace, consumerGroup, rpcHook, new AllocateMessageQueueAveragely(),
				enableMsgTrace, environment.resolveRequiredPlaceholders(topic));
			consumer.setVipChannelEnabled(false);
			consumer.setInstanceName(RocketMQUtil.getInstanceName(rpcHook, consumerGroup));
		} else {
			log.warn("RocketMQ access-key or secret-key not configure in {}.", this.getClass().getName());
			consumer = new DefaultMQPushConsumer(namespace, consumerGroup, null, new AllocateMessageQueueAveragely(),
				enableMsgTrace, environment.resolveRequiredPlaceholders(topic));
		}
		consumer.setNamesrvAddr(rocketMQConfig.getNameServer());

		// 消费者本地缓存消息数，超过这个阈值会降低消费速率
		int pullThresholdForQueue = 1000;
		if (rocketMQConfig.getConsumer().getPullThresholdForQueue() > 0) {
			pullThresholdForQueue = rocketMQConfig.getConsumer().getPullThresholdForQueue();
		}
		consumer.setPullThresholdForQueue(pullThresholdForQueue);

		// 消费者本地缓存消息大小，超过这个阈值会降低消费速率
		int pullThresholdSizeForQueue = 100;
		if (rocketMQConfig.getConsumer().getPullThresholdSizeForQueue() > 0) {
			pullThresholdSizeForQueue = rocketMQConfig.getConsumer().getPullThresholdSizeForQueue();
		}
		consumer.setPullThresholdSizeForQueue(pullThresholdSizeForQueue);

		// 批量拉取消息条数
		int pullBatchSize = 32;
		if (annotation.pullBatchSize() > 0) {
			pullBatchSize = annotation.pullBatchSize();
		} else if (rocketMQConfig.getConsumer().getPullBatchSize() > 0) {
			pullBatchSize = rocketMQConfig.getConsumer().getPullBatchSize();
		}
		consumer.setPullBatchSize(pullBatchSize);

		// 批量消费消息条数
		int consumeMessageBatchMaxSize = 1;
		if (annotation.consumeMessageBatchMaxSize() > 0) {
			consumeMessageBatchMaxSize = annotation.consumeMessageBatchMaxSize();
		} else if (rocketMQConfig.getConsumer().getConsumeMessageBatchMaxSize() > 0) {
			consumeMessageBatchMaxSize = rocketMQConfig.getConsumer().getConsumeMessageBatchMaxSize();
		}
		consumer.setConsumeMessageBatchMaxSize(consumeMessageBatchMaxSize);

		// 消费者本地缓存消息跨度，超过这个阈值会降低消费速率
		int consumeConcurrentlyMaxSpan = 2000;
		if (rocketMQConfig.getConsumer().getConsumeConcurrentlyMaxSpan() > 0) {
			consumeConcurrentlyMaxSpan = rocketMQConfig.getConsumer().getConsumeConcurrentlyMaxSpan();
		}
		consumer.setConsumeConcurrentlyMaxSpan(consumeConcurrentlyMaxSpan);

		// 消费最大线程
		int consumeThreadMax = 64;
		if (annotation.consumeThreadMax() > 0) {
			consumeThreadMax = annotation.consumeThreadMax();
		} else if (rocketMQConfig.getConsumer().getConsumeThreadMax() > 0) {
			consumeThreadMax = rocketMQConfig.getConsumer().getConsumeThreadMax();
		}
		consumer.setConsumeThreadMax(consumeThreadMax);

		// 消费最小线程
		int consumeThreadMin = 1;
		if (annotation.consumeThreadMin() > 0) {
			consumeThreadMin = annotation.consumeThreadMin();
		} else if (rocketMQConfig.getConsumer().getConsumeThreadMax() > 0) {
			consumeThreadMin = rocketMQConfig.getConsumer().getConsumeThreadMin();
		}
        consumer.setConsumeThreadMin(Math.min(consumeThreadMin, consumeThreadMax));

		// 消费超时
		if (annotation.consumeTimeout() > 0) {
			consumer.setConsumeTimeout(annotation.consumeTimeout());
		} else if (rocketMQConfig.getConsumer().getConsumeTimeout() > 0) {
			consumer.setConsumeTimeout(rocketMQConfig.getConsumer().getConsumeTimeout());
		}

		// 消息模式
		switch (annotation.messageModel()) {
			case BROADCASTING:
				consumer.setMessageModel(MessageModel.BROADCASTING);
				break;
			case CLUSTERING:
				consumer.setMessageModel(MessageModel.CLUSTERING);
				break;
			default:
				String messageModel = rocketMQConfig.getConsumer().getMessageModel();
				AssertUtils.notNull(messageModel, "PROP-REQUIRED-500", "rocketmq.consumer.messageModel");
				consumer.setMessageModel(MessageModel.valueOf(rocketMQConfig.getConsumer().getMessageModel()));
		}

		// 消息选择器类型
		String selectorExpression = annotation.selectorExpression();
		AssertUtils.notNull(selectorExpression, "PROP-REQUIRED-500", "rocketmq.consumer.selectorType");
		MessageSelector messageSelector;
		switch (annotation.selectorType()) {
			case TAG:
				messageSelector = MessageSelector.byTag(selectorExpression);
				break;
			case SQL92:
				messageSelector = MessageSelector.bySql(selectorExpression);
				break;
			default:
				messageSelector = ExpressionType.isTagType(rocketMQConfig.getConsumer().getSelectorType()) ?
					MessageSelector.byTag(selectorExpression) : MessageSelector.bySql(selectorExpression);
				consumer.setMessageModel(MessageModel.valueOf(rocketMQConfig.getConsumer().getMessageModel()));
		}
		consumer.subscribe(topic, messageSelector);

		// 设置顺序模式或者并发模式
		ConsumeMode consumeMode = annotation.consumeMode() != ConsumeMode.UNSET ?
			annotation.consumeMode() : ConsumeMode.valueOf(rocketMQConfig.getConsumer().getConsumeMode());
		switch (consumeMode) {
			case ORDERLY:
				consumer.setMessageListener(new DefaultMessageListenerOrderly(messageQueueConsumer));
				break;
			case CONCURRENTLY:
				consumer.setMessageListener(new DefaultMessageListenerConcurrently(messageQueueConsumer));
				break;
			default:
				throw new IllegalArgumentException("Property 'consumeMode' was wrong.");
		}

		log.debug("Create DefaultMQPushConsumer, group: {}, namespace: {}, topic: {}", consumerGroup, namespace, topic);
		consumers.put(topic, consumer);
		return consumer;
	}

	@RequiredArgsConstructor
	public class DefaultMessageListenerConcurrently implements MessageListenerConcurrently {

		private final MessageQueueConsumer messageQueueConsumer;

		@Override
		public ConsumeConcurrentlyStatus consumeMessage(List<MessageExt> messageExts, ConsumeConcurrentlyContext context) {
			AtomicReference<ConsumeConcurrentlyStatus> status =
				new AtomicReference<>(ConsumeConcurrentlyStatus.RECONSUME_LATER);
			List<Message> messages = getMessages(messageExts);
			long now = System.currentTimeMillis();
			try {
				messageQueueConsumer.consume(messages, () -> status.set(ConsumeConcurrentlyStatus.CONSUME_SUCCESS));
				long costTime = System.currentTimeMillis() - now;
				log.debug("consume message concurrently cost {} ms, message: {}", costTime, messageExts);
			} catch (Exception e) {
				log.warn("consume message concurrently failed, message: {}", messageExts, e);
				context.setDelayLevelWhenNextConsume(rocketMQConfig.getConsumer().getDelayLevelWhenNextConsume());
			}
			return status.get();
		}
	}

	@RequiredArgsConstructor
	public class DefaultMessageListenerOrderly implements MessageListenerOrderly {

		public final MessageQueueConsumer messageQueueConsumer;

		@Override
		public ConsumeOrderlyStatus consumeMessage(List<MessageExt> messageExts, ConsumeOrderlyContext context) {
			AtomicReference<ConsumeOrderlyStatus> status =
				new AtomicReference<>(ConsumeOrderlyStatus.SUSPEND_CURRENT_QUEUE_A_MOMENT);
			List<Message> messages = getMessages(messageExts);
			long now = System.currentTimeMillis();
			try {
				messageQueueConsumer.consume(messages, () -> status.set(ConsumeOrderlyStatus.SUCCESS));
				long costTime = System.currentTimeMillis() - now;
				log.debug("consume message concurrently cost {} ms, message: {}", costTime, messageExts);
			} catch (Exception e) {
				log.warn("consume message concurrently failed, message: {}", messageExts, e);
				context.setSuspendCurrentQueueTimeMillis(rocketMQConfig.getConsumer().getSuspendCurrentQueueTimeMillis());
			}
			return status.get();
		}
	}

	@NotNull
	private static List<Message> getMessages(List<MessageExt> messageExts) {
		List<Message> messages = Lists.newArrayListWithCapacity(messageExts.size());
		messageExts.forEach(messageExt -> messages.add(
			Message.builder()
				.topic(messageExt.getTopic())
				.partition(messageExt.getQueueId())
				.key(messageExt.getKeys())
				.tags(messageExt.getTags())
				.delayTimeLevel(messageExt.getDelayTimeLevel())
				.body(new String(messageExt.getBody()))
				.build()));
		return messages;
	}
}
```

同理，启用 `Kafka` 时，通过 `KafkaConsumer` 类实现 `MessageQueueListener` 解析，并实现消息消费。

```java
@RequiredArgsConstructor
@Slf4j
public class KafkaConsumer implements InitializingBean, DisposableBean {

	private final List<Consumer<String, String>> consumers = Lists.newArrayList();

	private final KafkaProperties kafkaConfig;

	private final List<MessageQueueConsumer> messageQueueConsumers;

	private final ConsumerFactory<String, String> consumerFactory;

	private final Function<String, Boolean> matcher;

	private final AtomicBoolean threadRunning = new AtomicBoolean(false);

	@Override
	public void afterPropertiesSet() {
		log.debug("Initializing KafkaConsumer");
		if (CollectionUtils.isEmpty(messageQueueConsumers)) {
			return;
		}
		for (MessageQueueConsumer messageQueueConsumer : messageQueueConsumers) {
			Consumer<String, String> consumer = initKafkaConsumer(messageQueueConsumer);
			if (consumer == null) {
				continue;
			}
			consumers.add(consumer);

			new Thread(() -> {
				while (threadRunning.get()) {
					try {
						ConsumerRecords<String, String> consumerRecords =
							consumer.poll(kafkaConfig.getConsumer().getFetchMaxWait());
						if (consumerRecords == null || consumerRecords.isEmpty()) {
							continue;
						}
						int maxPollRecords = kafkaConfig.getConsumer().getMaxPollRecords();
						Map<TopicPartition, OffsetAndMetadata> offsets = Maps.newHashMapWithExpectedSize(maxPollRecords);
						List<Message> messages = Lists.newArrayListWithCapacity(consumerRecords.count());
						consumerRecords.forEach(record -> {
							offsets.put(new TopicPartition(record.topic(), record.partition()),
								new OffsetAndMetadata(record.offset() + 1));

							messages.add(Message.builder()
								.topic(record.topic())
								.partition(record.partition())
								.key(record.key())
								.body(record.value()).build());
						});
						messageQueueConsumer.consume(messages, () -> consumer.commitSync(offsets));
					} catch (Exception e) {
						log.error("KafkaConsumerProcessor consume error: {}", e.getMessage(), e);
					}
				}
			}).start();
		}
		threadRunning.set(true);
	}

	@Override
	public void destroy() {
		log.debug("Destroy KafkaConsumer");
		threadRunning.set(false);
		consumers.forEach(Consumer::unsubscribe);
		consumers.clear();
	}

	private Consumer<String, String> initKafkaConsumer(MessageQueueConsumer messageQueueConsumer) {
		Class<? extends MessageQueueConsumer> clazz = messageQueueConsumer.getClass();
		MessageQueueListener annotation = clazz.getAnnotation(MessageQueueListener.class);
		if (!matcher.apply(annotation.type())) {
			return null;
		}

		String topic = annotation.topic();

		String group = null;
		if (StringUtils.isNotBlank(kafkaConfig.getConsumer().getGroupId())) {
			group = kafkaConfig.getConsumer().getGroupId() + Strings.UNDERLINE + topic;
		} else if (StringUtils.isNotBlank(annotation.group())) {
			group = annotation.group();
		}

		Consumer<String, String> consumer = consumerFactory.createConsumer(group, kafkaConfig.getClientId());
		consumer.subscribe(Collections.singleton(topic));

		log.debug("Create consumer from consumerFactory, group: {}, topic: {}", group, topic);
		return consumer;
	}
}
```

为了简化配置，我们通过 `Spring Boot` 的自动装配机制，动态选择使用 `RocketMQ` 或 `Kafka`。

```java
@Data
@ConfigurationProperties(prefix = MessageQueueProperties.PREFIX)
public class MessageQueueProperties {

	public static final String PREFIX = "spring.message-queue.dynamic";

	private boolean enabled;

	private String primary = "RocketMQ";
}

@ConditionalOnProperty(
	prefix = "spring.message-queue.dynamic",
	name = "primary",
	havingValue = "RocketMQ",
	matchIfMissing = true
)
@ConditionalOnExpression("${rocketmq.enabled:true}")
@ConditionalOnBean(RocketMQProperties.class)
@ConditionalOnClass(RocketMQTemplate.class)
@AutoConfigureAfter(MessageQueueAutoConfiguration.class)
@EnableConfigurationProperties({
	RocketMQProducerProperties.class,
	RocketMQConsumerProperties.class
})
@RequiredArgsConstructor
@Slf4j
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Configuration(proxyBeanMethods = false)
public class RocketMQMessageQueueAutoConfiguration {

	private final MessageQueueProperties messageQueueProperties;

	private final RocketMQProperties rocketMQProperties;

	@Bean
	public RocketMQConsumer rocketMQConsumer(RocketMQConsumerProperties rocketMQConsumerProperties,
											 ObjectProvider<List<MessageQueueConsumer>> messageListeners) {
		log.debug("Autowired RocketMQConsumer");
		Function<String, Boolean> matcher = type -> StringUtils.isBlank(type) && messageQueueProperties.getPrimary() != null ?
			MessageQueueType.ROCKETMQ.name().equalsIgnoreCase(messageQueueProperties.getPrimary()) :
			MessageQueueType.ROCKETMQ.name().equalsIgnoreCase(type);
		RocketMQConfig config = RocketMQConvertor.INSTANCE.toConfig(rocketMQProperties);
		RocketMQConvertor.INSTANCE.updateConfigFromConsumer(rocketMQConsumerProperties, config.getConsumer());
		return new RocketMQConsumer(config, messageListeners.getIfAvailable(), matcher);
	}

	@Bean
	public MessageQueueProvider messageQueueProvider(RocketMQProducerProperties rocketMQProducerProperties,
													 RocketMQTemplate rocketMQTemplate) {
		log.debug("Autowired RocketMQProvider");
		RocketMQConfig config = RocketMQConvertor.INSTANCE.toConfig(rocketMQProperties);
		RocketMQConvertor.INSTANCE.updateConfigFromProducer(rocketMQProducerProperties, config.getProducer());
		return new RocketMQProvider(config, rocketMQTemplate);
	}
}

@ConditionalOnProperty(
	prefix = "spring.message-queue.dynamic",
	name = "primary",
	havingValue = "Kafka"
)
@ConditionalOnExpression("${spring.kafka.enabled:true}")
@ConditionalOnBean(KafkaProperties.class)
@ConditionalOnClass(KafkaTemplate.class)
@AutoConfigureAfter(MessageQueueAutoConfiguration.class)
@RequiredArgsConstructor
@Slf4j
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Configuration(proxyBeanMethods = false)
public class KafkaMessageQueueAutoConfiguration {

	private final MessageQueueProperties messageQueueProperties;

	private final KafkaProperties kafkaProperties;

	@Bean
	public KafkaConsumer kafkaConsumer(ObjectProvider<List<MessageQueueConsumer>> messageListeners,
									   ObjectProvider<ConsumerFactory<String, String>> consumerFactory) {
		log.debug("Autowired KafkaConsumer");
		Function<String, Boolean> matcher = type -> StringUtils.isBlank(type) && messageQueueProperties.getPrimary() != null ?
			MessageQueueType.KAFKA.name().equalsIgnoreCase(messageQueueProperties.getPrimary()) :
			MessageQueueType.KAFKA.name().equalsIgnoreCase(type);
		return new KafkaConsumer(kafkaProperties, messageListeners.getIfAvailable(),
			consumerFactory.getIfAvailable(), matcher);
	}

	@Bean
	public MessageQueueProvider messageQueueProvider(KafkaTemplate<String, String> kafkaTemplate) {
		log.debug("Autowired KafkaProvider");
		return new KafkaProvider(kafkaTemplate);
	}
}
```

通过 `spring.message-queue.dynamic.primary` 配置项，可以动态切换消息队列的实现。

## 消费者代码示例

消费者代码片段如下。

```java
@RequiredArgsConstructor
@Slf4j
@MessageQueueListener(topic = "demo-cola-user") // 该注解会触发消息消费
public class UserConsumer implements MessageQueueConsumer {

	/**
	 * 消费消息
	 *
	 * @param messages
	 * @param ack
	 */
	@Override
	public void consume(List<Message> messages, Acknowledgement ack) {
		log.info("消费消息: {}", messages);
		ack.acknowledge();
	}
}
```

对应的 `application.yaml` 配置如下。关于 `RocketMQ` 或者 `Kafka` 的详细配置，我们直接沿用官方的基础配置。

```yaml
spring:
  message-queue:
    dynamic:
      primary: RocketMQ # 配置 RocketMQ 或者 Kafka
  kafka: # 官方原生配置
    client-id: ${spring.application.name}
	bootstrap-servers: localhost:9092
    consumer:
      group-id: ${spring.application.name} # 消费组，同一个消费组的实例数或者线程数不能超过 Kafka 的分区数量
      enable-auto-commit: false # 建议关闭自动提交 Offset，不然报错很难处理
      auto-offset-reset: earliest # 设置消费者重连是否自动重置到最开始的消息偏移量
      heartbeat-interval: 5000 # 心跳频率
      max-poll-records: 100 # 单次拉取最大记录数
      fetch-max-wait: 3000 # 未达到 fetch-min-size 时，阻塞拉取消息的时长
      fetch-min-size: 4096 # 触发拉取消息的最小值
      isolation-level: READ_COMMITTED # 隔离级别：READ_UNCOMMITTED/READ_COMMITTED
    listener:
      type: BATCH # 监听类型：BATCH/SINGLE
      ack-mode: MANUAL_IMMEDIATE # 手动提交模式
      concurrency: 5 # 消费监听线程数，当配置值大于 Kafka 分区数，按分区数执行
      poll-timeout: 5000 # 单次拉取消息的超时时间
      idle-between-polls: 0 # 拉取消息的空闲时间
      idle-event-interval: 0 # 没有可消费的消息时空闲的间隔时间

rocketmq:  # 官方原生配置
  name-server: localhost:9876
  consumer:
    namespace: ${spring.profiles.active}
    group: ${spring.application.name}
    pull-batch-size: 500 # 单次拉取消息条数
    consume-message-batch-max-size: 100 # 单次消费消息条数
    consume-mode: CONCURRENTLY # CONCURRENTLY：并发模式，ORDERLY：顺序模式
    consume-thread-min: 8 # 消费最小线程数
    consume-thread-max: 64 # 消费最大线程数
    consume-timeout: 15 # 消费超时（分钟）
    suspend-current-queue-time-millis: 1000 # 顺序模式下消费者重试暂停的时间
    delay-level-when-next-consume: 0 # 并发模式下消费者重试频率，0：Broker 控制重试、-1：不重试直接进入死信、大于1：参考 Client 重试级别
```

## 生产者接口设计

同样的思路，定义 `MessageQueueProvider` 生产者接口。

```java
public interface MessageQueueProvider {

	/**
	 * 消息类型
	 *
	 * @return 消息类型
	 */
	String messageQueueType();

	/**
	 * 同步发送消息
	 *
	 * @param message 消息实体
	 * @return 消息发送结果
	 */
	MessageSendResult syncSend(Message message);

	/**
	 * 异步发送消息
	 *
	 * @param message 消息实体
	 * @param messageCallback 消息回调
	 */
	void asyncSend(Message message, MessageSendCallback messageCallback);
}

public interface MessageSendCallback {

	/**
	 * 消息发送成功
	 *
	 * @param result 消息发送结果
	 */
	void onSuccess(MessageSendResult result);

	/**
	 * 消息发送失败
	 *
	 * @param e 异常堆栈
	 */
	void onFailed(Throwable e);
}

@Accessors(chain = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@ToString
@Data
public class MessageSendResult {

	/**主题 */
	private String topic;

	/**分区 */
	private Integer partition;

	/** 偏移量 */
	private Long offset;

	/** 事务ID */
	private String transactionId;
}
```

定义 `RocketMQProvider` 类实现 `MessageQueueProvider` 接口。

```java
@RequiredArgsConstructor
@Slf4j
public class RocketMQProvider implements MessageQueueProvider {

	private final RocketMQConfig rocketMQConfig;

	private final RocketMQTemplate rocketMQTemplate;

	/**
	 * 消息类型
	 *
	 * @return 消息类型
	 */
	@Override
	public String messageQueueType() {
		return MessageQueueType.ROCKETMQ.name();
	}

	/**
	 * 同步发送消息
	 *
	 * @param message
	 * @return
	 */
	@Override
	public MessageSendResult syncSend(Message message) {
		DefaultMQProducer producer = rocketMQTemplate.getProducer();
		if (StringUtils.isNotBlank(rocketMQConfig.getProducer().getNamespace())) {
			producer.setNamespace(rocketMQConfig.getProducer().getNamespace());
		} else if (StringUtils.isNotBlank(message.getNamespace())) {
			producer.setNamespace(message.getNamespace());
		}
		try {
			SendResult sendResult = producer.send(transfer(message));
			return transfer(sendResult);
		} catch (InterruptedException e) {
			log.error("RocketMQProvider send interrupted: {}", e.getMessage(), e);
			Thread.currentThread().interrupt();
			throw new MessageSendException(e.getMessage());
		} catch (Exception e) {
			log.error("RocketMQProvider send error: {}", e.getMessage(), e);
			throw new MessageSendException(e.getMessage());
		}
	}

	/**
	 * 异步发送消息
	 *
	 * @param message
	 * @param messageCallback
	 */
	@Override
	public void asyncSend(Message message, MessageSendCallback messageCallback) {
		DefaultMQProducer producer = rocketMQTemplate.getProducer();
		if (StringUtils.isNotBlank(rocketMQConfig.getProducer().getNamespace())) {
			producer.setNamespace(rocketMQConfig.getProducer().getNamespace());
		} else if (StringUtils.isNotBlank(message.getNamespace())) {
			producer.setNamespace(message.getNamespace());
		}

		try {
			producer.send(transfer(message), new SendCallback() {

				@Override
				public void onSuccess(SendResult sendResult) {
					messageCallback.onSuccess(transfer(sendResult));
				}

				@Override
				public void onException(Throwable e) {
					messageCallback.onFailed(e);
				}
			});
		} catch (InterruptedException e) {
			log.error(ROCKETMQ_PROVIDER_SEND_INTERRUPTED, e.getMessage(), e);
			Thread.currentThread().interrupt();
			throw new MessageSendException(e.getMessage());
		} catch (Exception e) {
			log.error(ROCKETMQ_PROVIDER_CONSUME_ERROR, e.getMessage(), e);
			throw new MessageSendException(e.getMessage());
		}
	}

	/**
	 * 转换为 RocketMQ 消息
	 *
	 * @param message
	 * @return
	 */
	private org.apache.rocketmq.common.message.Message transfer(Message message) {
		org.apache.rocketmq.common.message.Message rocketMsg =
			new org.apache.rocketmq.common.message.Message(message.getTopic(), message.getTags(),
				message.getKey(), message.getBody().getBytes(StandardCharsets.UTF_8));
		if (message.getDelayTimeLevel() > 0) {
			rocketMsg.setDelayTimeLevel(message.getDelayTimeLevel());
		}
		return rocketMsg;
	}

	/**
	 * 转化为自定义的 MessageSendResult
	 *
	 * @param sendResult
	 * @return
	 */
	private MessageSendResult transfer(SendResult sendResult) {
		return MessageSendResult.builder()
			.topic(sendResult.getMessageQueue().getTopic())
			.partition(sendResult.getMessageQueue().getQueueId())
			.offset(sendResult.getQueueOffset())
			.transactionId(sendResult.getTransactionId())
			.build();
	}
}
```

定义 `KafkaProvider` 类实现 `MessageQueueProvider` 接口。

```java
@RequiredArgsConstructor
@Slf4j
public class KafkaProvider implements MessageQueueProvider {

	private static final String KAFKA_PROVIDER_SEND_INTERRUPTED = "KafkaProvider send interrupted: {}";

	private static final String KAFKA_PROVIDER_CONSUME_ERROR = "KafkaProvider send error: {}";

	private final KafkaTemplate<String, String> kafkaTemplate;

	/**
	 * 消息类型
	 *
	 * @return 消息类型
	 */
	@Override
	public String messageQueueType() {
		return MessageQueueType.KAFKA.name();
	}

	/**
	 * 同步发送消息
	 *
	 * @param message
	 * @return
	 */
	@Override
	public MessageSendResult syncSend(Message message) {
		try {
			ListenableFuture<SendResult<String, String>> future = kafkaTemplate.send(message.getTopic(), message.getBody());
			SendResult<String, String> sendResult = future.get();
			return transfer(sendResult);
		} catch (InterruptedException e) {
			log.error(KAFKA_PROVIDER_SEND_INTERRUPTED, e.getMessage(), e);
			Thread.currentThread().interrupt();
			throw new MessageSendException(e.getMessage());
		} catch (Exception e) {
			log.error(KAFKA_PROVIDER_CONSUME_ERROR, e.getMessage(), e);
			throw new MessageSendException(e.getMessage());
		}
	}

	/**
	 * 异步发送消息
	 *
	 * @param message
	 * @param messageCallback
	 */
	@Override
	public void asyncSend(Message message, MessageSendCallback messageCallback) {
		try {
			ListenableFuture<SendResult<String, String>> future = kafkaTemplate.send(message.getTopic(), message.getBody());
			future.addCallback(new ListenableFutureCallback<SendResult<String, String>>() {

				@Override
				public void onSuccess(SendResult<String, String> sendResult) {
					messageCallback.onSuccess(transfer(sendResult));
				}

				@Override
				public void onFailure(Throwable e) {
					messageCallback.onFailed(e);
				}
			});
		} catch (Exception e) {
			log.error(KAFKA_PROVIDER_CONSUME_ERROR, e.getMessage(), e);
			throw new MessageSendException(e.getMessage());
		}
	}

	/**
	 * 转化为自定义的 MessageSendResult
	 *
	 * @param sendResult
	 * @return
	 */
	private MessageSendResult transfer(SendResult<String, String> sendResult) {
		ProducerRecord<String, String> producerRecord = sendResult.getProducerRecord();
		RecordMetadata recordMetadata = sendResult.getRecordMetadata();
		return MessageSendResult.builder()
			.topic(producerRecord.topic())
			.partition(recordMetadata.partition())
			.offset(recordMetadata.offset())
			.build();
	}
}
```

## 生产者代码示例

业务只需要引入 `MessageQueueProvider` 就可以实现消息的发送，代码片段如下。

```java
@RequiredArgsConstructor
@Slf4j
@Component
public class UserMQProducer {

	private final MessageQueueProvider messageQueueProvider;

	public void send(User user) {
		MessageSendResult result =
			messageQueueProvider.syncSend(Message.builder()
				.topic("demo-cola-user")
				.key(String.valueOf(user.getId()))
				.tags("demo")
				.delayTimeLevel(2)
				.body(JSONHelper.json().toJSONString(user)).build());

		log.info("发送消息成功, topic: {}, offset: {}, queueId: {}",
			result.getTopic(), result.getOffset(), result.getPartition());

		messageQueueProvider.asyncSend(Message.builder()
				.topic("demo-cola-user")
				.key(String.valueOf(user.getId()))
				.tags("demo")
				.delayTimeLevel(2)
				.body(JSONHelper.json().toJSONString(user)).build(),
			new MessageSendCallback() {

				@Override
				public void onSuccess(MessageSendResult result) {
					log.info("发送消息成功, topic: {}, offset: {}, queueId: {}",
						result.getTopic(), result.getOffset(), result.getPartition());
				}

				@Override
				public void onFailed(Throwable e) {
					log.info("发送消息失败: {}" , e.getMessage(), e);
				}
			});
	}
}
```

对应的 `application.yaml` 配置如下。

```yaml
spring:
  message-queue:
    dynamic:
      primary: RocketMQ # 配置 RocketMQ 或者 Kafka
  kafka: # 官方原生配置
    client-id: ${spring.application.name}
	bootstrap-servers: localhost:9092
    producer:
      acks: all # 发送确认机制
      batch-size: 4KB # 批处理发送主题大小
      buffer-memory: 40960 # 发送缓冲大小
      retries: 3 # 默认为 0，发送主题失败后重试的次数
      compression-type: lz4 # 压缩类型

rocketmq:  # 官方原生配置
  name-server: localhost:9876
  producer:
    namespace: ${spring.profiles.active}
    group: ${spring.application.name}
    send-message-timeout: 3000 # 生产消息超时
    retry-times-when-send-failed: 2 # 同步模式生产消息失败重试次数
    retry-times-when-send-async-failed: 2 # 异步模式生产消息失败重试次数
```

这样就完成了，我们生产消息只需要调用 `MessageQueueProvider` 就可以实现消息的发送，通过继承 `MessageQueueConsumer`，并 `@MessageQueueListener` 注解，就可以实现消息的消费，业务代码上并没有涉及到第三方消息队列 API。

# 产出

通过 API 封装，我们成功实现了消息队列的可切换性，业务代码无需依赖具体的消息队列 API，只需要切换 `spring.message-queue.dynamic.primary` 配置项，就可以动态实现消息队列的切换。

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-common-mq](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-solutions/eden-common-mq) 和 [eden-common-mq-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-common-mq-spring-boot-starter)。