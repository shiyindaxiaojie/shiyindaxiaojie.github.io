---
title: Spring Boot Implementation of Scalable Message Queue
date: 2024-02-16
description: In complex distributed systems, message queues (such as RocketMQ, Kafka, RabbitMQ) are often used to optimize system performance.
tags:
  - Extension Points
  - Spring
  - Spring Boot
  - Message Queue
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# Background

In complex distributed systems, message queues (such as `RocketMQ`, `Kafka`, `RabbitMQ`) are often used to optimize system performance. However, directly introducing APIs of these message queues in the code leads to strong coupling between the system and specific message queue components, making it difficult to switch to other message queue components later. Although `Spring Cloud Stream` provides an abstraction layer, it introduces complex concepts (such as binders, channels, handlers, etc.) and is incompatible with lower versions of `Spring Boot`.

To solve these problems, we decided to develop a concise and switchable MQ component that retains native configuration, shields underlying API details, and uses `Spring Boot` auto-configuration for management.

# Objective

1. Encapsulate common interfaces: Provide a unified interface to shield the API details of underlying message queues.
2. Retain native configuration: Support native configurations of message queues such as `RocketMQ` and `Kafka`.
3. Out-of-the-box: Simplify configuration and integration through `Spring Boot`'s auto-configuration mechanism.

# Implementation

## Message Model Design

First, define a generic message model `Message` to encapsulate the message content produced and consumed in business projects. This model is compatible with the message structures of RocketMQ and Kafka.

```java
@Accessors(chain = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@ToString
@Data
public class Message implements Serializable {

	/** Namespace */
	private String namespace;

	/** Topic */
	private String topic;

	/** Partition/Queue */
	private Integer partition;

	/** Partition Key */
	private String key;

	/** Tag Filtering */
	private String tags;

	/** Message Body */
	private String body;

	/** Delay Level */
	@Builder.Default
	private Integer delayTimeLevel = 0;
}
```

## Consumer Interface Design

Define the `MessageQueueConsumer` interface to handle message consumption logic. Through the `@MessageQueueListener` annotation, consumption parameters such as topic, consumer group, and consumption threads can be configured.

```java
public interface MessageQueueConsumer {

	/**
	 * Consume message
	 *
	 * @param messages Message payload
	 * @param ack Message acknowledgement
	 */
	void consume(List<Message> messages, Acknowledgement ack);
}

@FunctionalInterface
public interface Acknowledgement {

	/**
	 * Commit
	 */
	void acknowledge();
}
```

Define the `@MessageQueueListener` annotation to configure consumer behavior, such as consumption topic, consumer group, consumption mode, message filtering, etc.

```java
@Component
@Documented
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface MessageQueueListener {

	/**
	 * Message Queue Type
	 *
	 * @return Message Queue Type
	 */
	String type() default Strings.EMPTY;

	/**
	 * Set Consumer Group
	 *
	 * @return Consumer Group Name
	 */
	String group() default Strings.EMPTY;

	/**
	 * Set Message Topic
	 *
	 * @return Message Topic
	 */
	String topic() default Strings.EMPTY;

	/**
	 * Batch pull size from Broker
	 *
	 * @return Default pull 32 messages
	 */
	int pullBatchSize() default 0;

	/**
	 * Maximum number of messages consumed reported to Broker. When pull size > consume size, it splits into multiple threads for concurrent processing
	 *
	 * @return Default consume 1 message
	 */
	int consumeMessageBatchMaxSize() default 0;

	/**
	 * Minimum consumption threads
	 *
	 * @return Default 8 threads
	 */
	int consumeThreadMin() default 0;

	/**
	 * Maximum consumption threads
	 *
	 * @return Default 64 threads
	 */
	int consumeThreadMax() default 0;

	/**
	 * Consumption timeout
	 *
	 * @return Default 15 minutes
	 */
	long consumeTimeout() default 0;

	/**
	 * Consumption mode
	 *
	 * @return Default concurrent consumption, order not guaranteed
	 */
	ConsumeMode consumeMode() default ConsumeMode.UNSET;

	/**
	 * Message model
	 *
	 * @return Default clustering mode
	 */
	MessageModel messageModel() default MessageModel.UNSET;

	/**
	 * Message selector type
	 *
	 * @return Default filter by Tag
	 */
	MessageSelectorType selectorType() default MessageSelectorType.UNSET;

	/**
	 * Message filtering rule
	 *
	 * @return Default full fuzzy match
	 */
	String selectorExpression() default "*";

	/**
	 * Whether to enable message trace
	 *
	 * @return Default enabled
	 */
	boolean enableMsgTrace() default true;
}
```

When we enable RocketMQ, `RocketMQConsumer` parses the `@MessageQueueListener` annotation to implement message consumption.

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

		// Namespace
		String namespace = null;
		if (StringUtils.isNotBlank(rocketMQConfig.getConsumer().getNamespace())) {
			namespace = rocketMQConfig.getConsumer().getNamespace();
		}

		// Topic
		String topic = null;
		if (StringUtils.isNotBlank(annotation.topic())) {
			topic = annotation.topic();
		} else if (StringUtils.isNotBlank(rocketMQConfig.getConsumer().getTopic())) {
			topic = rocketMQConfig.getConsumer().getTopic();
		}
		AssertUtils.notNull(topic, "PROP-REQUIRED-500", "rocketmq.consumer.topic");

		// Consumer Group
		String consumerGroup = null;
		if (StringUtils.isNotBlank(annotation.group())) {
			consumerGroup = annotation.group();
		} else if (StringUtils.isNotBlank(rocketMQConfig.getConsumer().getGroup())) {
			consumerGroup = rocketMQConfig.getConsumer().getGroup() + Strings.UNDERLINE + topic;
		}
		AssertUtils.notNull(consumerGroup, "PROP-REQUIRED-500", "rocketmq.consumer.group");

		// Initialize Consumer
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

		// Consumer local cache message count, exceeding this threshold reduces consumption rate
		int pullThresholdForQueue = 1000;
		if (rocketMQConfig.getConsumer().getPullThresholdForQueue() > 0) {
			pullThresholdForQueue = rocketMQConfig.getConsumer().getPullThresholdForQueue();
		}
		consumer.setPullThresholdForQueue(pullThresholdForQueue);

		// Consumer local cache message size, exceeding this threshold reduces consumption rate
		int pullThresholdSizeForQueue = 100;
		if (rocketMQConfig.getConsumer().getPullThresholdSizeForQueue() > 0) {
			pullThresholdSizeForQueue = rocketMQConfig.getConsumer().getPullThresholdSizeForQueue();
		}
		consumer.setPullThresholdSizeForQueue(pullThresholdSizeForQueue);

		// Batch pull message count
		int pullBatchSize = 32;
		if (annotation.pullBatchSize() > 0) {
			pullBatchSize = annotation.pullBatchSize();
		} else if (rocketMQConfig.getConsumer().getPullBatchSize() > 0) {
			pullBatchSize = rocketMQConfig.getConsumer().getPullBatchSize();
		}
		consumer.setPullBatchSize(pullBatchSize);

		// Batch consume message count
		int consumeMessageBatchMaxSize = 1;
		if (annotation.consumeMessageBatchMaxSize() > 0) {
			consumeMessageBatchMaxSize = annotation.consumeMessageBatchMaxSize();
		} else if (rocketMQConfig.getConsumer().getConsumeMessageBatchMaxSize() > 0) {
			consumeMessageBatchMaxSize = rocketMQConfig.getConsumer().getConsumeMessageBatchMaxSize();
		}
		consumer.setConsumeMessageBatchMaxSize(consumeMessageBatchMaxSize);

		// Consumer local cache message span, exceeding this threshold reduces consumption rate
		int consumeConcurrentlyMaxSpan = 2000;
		if (rocketMQConfig.getConsumer().getConsumeConcurrentlyMaxSpan() > 0) {
			consumeConcurrentlyMaxSpan = rocketMQConfig.getConsumer().getConsumeConcurrentlyMaxSpan();
		}
		consumer.setConsumeConcurrentlyMaxSpan(consumeConcurrentlyMaxSpan);

		// Max consumption threads
		int consumeThreadMax = 64;
		if (annotation.consumeThreadMax() > 0) {
			consumeThreadMax = annotation.consumeThreadMax();
		} else if (rocketMQConfig.getConsumer().getConsumeThreadMax() > 0) {
			consumeThreadMax = rocketMQConfig.getConsumer().getConsumeThreadMax();
		}
		consumer.setConsumeThreadMax(consumeThreadMax);

		// Min consumption threads
		int consumeThreadMin = 1;
		if (annotation.consumeThreadMin() > 0) {
			consumeThreadMin = annotation.consumeThreadMin();
		} else if (rocketMQConfig.getConsumer().getConsumeThreadMax() > 0) {
			consumeThreadMin = rocketMQConfig.getConsumer().getConsumeThreadMin();
		}
        consumer.setConsumeThreadMin(Math.min(consumeThreadMin, consumeThreadMax));

		// Consumption timeout
		if (annotation.consumeTimeout() > 0) {
			consumer.setConsumeTimeout(annotation.consumeTimeout());
		} else if (rocketMQConfig.getConsumer().getConsumeTimeout() > 0) {
			consumer.setConsumeTimeout(rocketMQConfig.getConsumer().getConsumeTimeout());
		}

		// Message model
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

		// Message selector type
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

		// Set orderly or concurrently mode
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

Similarly, when enabling `Kafka`, `KafkaConsumer` class implements `MessageQueueListener` parsing and message consumption.

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

To simplify configuration, we use `Spring Boot`'s auto-configuration mechanism to dynamically select `RocketMQ` or `Kafka`.

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

Through the `spring.message-queue.dynamic.primary` configuration item, we can dynamically switch the implementation of the message queue.

## Consumer Code Example

Consumer code snippet follows.

```java
@RequiredArgsConstructor
@Slf4j
@MessageQueueListener(topic = "demo-cola-user") // This annotation triggers message consumption
public class UserConsumer implements MessageQueueConsumer {

	/**
	 * Consume message
	 *
	 * @param messages
	 * @param ack
	 */
	@Override
	public void consume(List<Message> messages, Acknowledgement ack) {
		log.info("Consume message: {}", messages);
		ack.acknowledge();
	}
}
```

The corresponding `application.yaml` configuration is as follows. For detailed configuration of `RocketMQ` or `Kafka`, we directly use the official basic configuration.

```yaml
spring:
  message-queue:
    dynamic:
      primary: RocketMQ # Configure RocketMQ or Kafka
  kafka: # Official native configuration
    client-id: ${spring.application.name}
	bootstrap-servers: localhost:9092
    consumer:
      group-id: ${spring.application.name} # Consumer group, the number of instances or threads in the same consumer group cannot exceed the number of partitions in Kafka
      enable-auto-commit: false # Recommended to disable auto commit Offset, otherwise error handling is difficult
      auto-offset-reset: earliest # Set whether consumer reset to the earliest message offset automatically when reconnecting
      heartbeat-interval: 5000 # Heartbeat interval
      max-poll-records: 100 # Single pull max records
      fetch-max-wait: 3000 # Blocking duration when fetch-min-size is not reached
      fetch-min-size: 4096 # Min value to trigger message pull
      isolation-level: READ_COMMITTED # Isolation level: READ_UNCOMMITTED/READ_COMMITTED
    listener:
      type: BATCH # Listener type: BATCH/SINGLE
      ack-mode: MANUAL_IMMEDIATE # Manual commit mode
      concurrency: 5 # Consumption listener threads, when configured value > Kafka partitions, executed by partition count
      poll-timeout: 5000 # Single pull message timeout
      idle-between-polls: 0 # Idle time between pulls
      idle-event-interval: 0 # Idle interval when no consumable messages

rocketmq:  # Official native configuration
  name-server: localhost:9876
  consumer:
    namespace: ${spring.profiles.active}
    group: ${spring.application.name}
    pull-batch-size: 500 # Single pull message count
    consume-message-batch-max-size: 100 # Single consume message count
    consume-mode: CONCURRENTLY # CONCURRENTLY: Concurrent mode, ORDERLY: Request mode
    consume-thread-min: 8 # Min consume threads
    consume-thread-max: 64 # Max consume threads
    consume-timeout: 15 # Consume timeout (minutes)
    suspend-current-queue-time-millis: 1000 # Suspend time for consumer retry in orderly mode
    delay-level-when-next-consume: 0 # Consumer retry frequency in concurrent mode, 0: Broker controls, -1: No retry, directly to dead letter, >1: Reference Client retry level
```

## Producer Interface Design

Similarly, define the `MessageQueueProvider` producer interface.

```java
public interface MessageQueueProvider {

	/**
	 * Message Queue Type
	 *
	 * @return Message Queue Type
	 */
	String messageQueueType();

	/**
	 * Send message synchronously
	 *
	 * @param message Message entity
	 * @return Message send result
	 */
	MessageSendResult syncSend(Message message);

	/**
	 * Send message asynchronously
	 *
	 * @param message Message entity
	 * @param messageCallback Message callback
	 */
	void asyncSend(Message message, MessageSendCallback messageCallback);
}

public interface MessageSendCallback {

	/**
	 * Message send success
	 *
	 * @param result Message send result
	 */
	void onSuccess(MessageSendResult result);

	/**
	 * Message send failed
	 *
	 * @param e Exception stack
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

	/** Topic */
	private String topic;

	/** Partition */
	private Integer partition;

	/** Offset */
	private Long offset;

	/** Transaction ID */
	private String transactionId;
}
```

Implement `RocketMQProvider` and `KafkaProvider` respectively.

```java
@RequiredArgsConstructor
@Slf4j
public class RocketMQProvider implements MessageQueueProvider {

	private final RocketMQConfig rocketMQConfig;

	private final RocketMQTemplate rocketMQTemplate;

	@Override
	public String messageQueueType() {
		return MessageQueueType.ROCKETMQ.name();
	}

	@Override
	public MessageSendResult syncSend(Message message) {
		String destination = buildDestination(message.getTopic(), message.getTags());
		SendResult sendResult = rocketMQTemplate.syncSend(destination, message.getBody());
		return MessageSendResult.builder()
			.topic(message.getTopic())
			.partition(sendResult.getMessageQueue().getQueueId())
			.offset(sendResult.getQueueOffset())
			.transactionId(sendResult.getTransactionId())
			.build();
	}

	@Override
	public void asyncSend(Message message, MessageSendCallback messageCallback) {
		String destination = buildDestination(message.getTopic(), message.getTags());
		rocketMQTemplate.asyncSend(destination, message.getBody(), new SendCallback() {
			@Override
			public void onSuccess(SendResult sendResult) {
				messageCallback.onSuccess(MessageSendResult.builder()
					.topic(message.getTopic())
					.partition(sendResult.getMessageQueue().getQueueId())
					.offset(sendResult.getQueueOffset())
					.transactionId(sendResult.getTransactionId())
					.build());
			}

			@Override
			public void onException(Throwable e) {
				messageCallback.onFailed(e);
			}
		});
	}

	private String buildDestination(String topic, String tags) {
		return topic + Strings.COLON + tags;
	}
}

@RequiredArgsConstructor
@Slf4j
public class KafkaProvider implements MessageQueueProvider {

	private final KafkaTemplate<String, String> kafkaTemplate;

	@Override
	public String messageQueueType() {
		return MessageQueueType.KAFKA.name();
	}

	@Override
	public MessageSendResult syncSend(Message message) {
		try {
			SendResult<String, String> sendResult = kafkaTemplate.send(message.getTopic(), message.getKey(), message.getBody()).get();
			return MessageSendResult.builder()
				.topic(message.getTopic())
				.partition(sendResult.getRecordMetadata().partition())
				.offset(sendResult.getRecordMetadata().offset())
				.build();
		} catch (Exception e) {
			throw new MessageQueueException(e);
		}
	}

	@Override
	public void asyncSend(Message message, MessageSendCallback messageCallback) {
		kafkaTemplate.send(message.getTopic(), message.getKey(), message.getBody()).addCallback(new ListenableFutureCallback<SendResult<String, String>>() {
			@Override
			public void onFailure(Throwable ex) {
				messageCallback.onFailed(ex);
			}

			@Override
			public void onSuccess(SendResult<String, String> result) {
				messageCallback.onSuccess(MessageSendResult.builder()
					.topic(message.getTopic())
					.partition(result.getRecordMetadata().partition())
					.offset(result.getRecordMetadata().offset())
					.build());
			}
		});
	}
}
```

## Producer Code Example

Producer code snippet follows.

```java
@Autowired
private MessageQueueProvider messageQueueProvider;

public void sendMessage() {
    Message message = Message.builder()
        .topic("demo-cola-user")
        .body("Hello World")
        .build();
    messageQueueProvider.syncSend(message);
}
```

# Output

Through these steps, we've successfully implemented a scalable message queue component.

Code is fully open source at [eden-common-mq-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-common-mq-spring-boot-starter).
