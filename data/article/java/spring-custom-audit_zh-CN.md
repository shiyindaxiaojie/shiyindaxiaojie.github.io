---
title: Spring Boot 实现自定义审计功能
date: 2024-02-11
description: 提供自定义注解给业务侧，实现开箱即用的事件审计存储功能。
tags:
  - 扩展点
  - Spring
  - Spring Boot
  - 自定义审计
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# 背景

在现代应用系统中，事件审计是一个至关重要的功能。通过记录用户的操作行为，我们可以追踪问题、分析用户行为，甚至在出现安全问题时提供关键证据。由于目前没有较好的事件审计框架，笔者决定实现一套可扩展的事件审计组件，要求对业务低侵入性，可以轻松获取前后变更的内容。

# 目标

提供自定义注解给业务侧，实现开箱即用的事件审计存储功能。

# 实现

## 审计

我们定义了 `@EventAuditor` 注解，关键字段包括 `operator`（操作人）、`content`（操作内容模板）、`bizScenario`（事件发生的场景）等。

```java
@Documented
@Inherited
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface EventAuditor {

	/**
	 * 操作对象，支持 SpEL 表达式
	 *
	 * @return 操作对象
	 */
	String operator() default Strings.EMPTY;

	/**
	 * 操作角色，支持 SpEL 表达式
	 * <br/> 用于区分运营人员和用户
	 *
	 * @return 操作角色
	 */
	String role() default Strings.EMPTY;

	/**
	 * 业务场景，支持 SpEL 表达式
	 * <br/> 推荐风格：产品线+用例+场景
	 *
	 * @return 业务场景
	 */
	String bizScenario() default Strings.EMPTY;

	/**
	 * 记录内容
	 *
	 * @return 记录内容，支持 SpEL 表达式
	 */
	String content() default Strings.EMPTY;

	/**
	 * 额外信息
	 * <br/> 防止记录的内容过长无法展示，额外序列化保存
	 *
	 * @return 额外信息，支持 SpEL 表达式
	 */
	String extra() default Strings.EMPTY;

	/**
	 * 触发条件
	 *
	 * @return 触发条件，为空表示默认触发
	 */
	String condition() default Strings.EMPTY;

	/**
	 * 调用方法之前解析 SpEL 参数
	 * <br/>
	 *
	 * @return 是否提前解析
	 */
	boolean evalBeforeInvoke() default true;

	/**
	 * 是否记录返回值
	 * <br/> 防止记录查询类返回的 List 大对象导致 OOM
	 *
	 * @return 是否记录
	 */
	boolean recordReturnValue() default false;
}
```

通过 Spring 的 `MethodInterceptor`，我们实现了 `EventAuditorInterceptor` 来捕获 `@EventAuditor` 注解，并在方法调用前后进行审计记录。

```java
@RequiredArgsConstructor
@Slf4j
public class EventAuditorInterceptor implements MethodInterceptor {

	private static final String RETURN = "_return";

	private static final String ERROR_MSG = "_errorMsg";

	private final EventAuditorConfig eventAuditorConfig;

	private AsyncTaskExecutor asyncTaskExecutor;

	/**
	 * 方法调用拦截处理
	 *
	 * @param invocation 方法调用元信息
	 * @return 返回值
	 * @throws Throwable 异常
	 */
	@Override
	public Object invoke(@NotNull MethodInvocation invocation) throws Throwable {
		if (AopUtils.isAopProxy(invocation.getThis())) {
			return invocation.proceed();
		}

		LocalDateTime now = LocalDateTime.now();
		Method method = invocation.getMethod();
		EventAuditor[] eventAuditors;
		try {
			eventAuditors = method.getAnnotationsByType(EventAuditor.class);
		} catch (Throwable throwable) {
			// 如果解析异常，直接执行返回
			return invocation.proceed();
		}

		List<AuditingEvent> events = Lists.newArrayList();
		events.addAll(parseList(invocation, eventAuditors, true));

		Object result = null;
		boolean success = true;
		long executionCost = 0L;
		String errorMsg = null;
		// 执行耗时
		String watchId = invocation.getClass() + Strings.DOT + invocation.getMethod().getName();
		StopWatch stopWatch = new StopWatch(watchId);
		stopWatch.start();
		try {
			result = invocation.proceed();
		} catch (Throwable e) {
			if (stopWatch.isRunning()) {
				stopWatch.stop();
				executionCost = stopWatch.getTotalTimeMillis();
			}
			success = false;
			errorMsg = e.getMessage();
			SpelEvaluationContext.setVariable(ERROR_MSG, errorMsg);    // 异常信息
			throw e;
		} finally {
			if (stopWatch.isRunning()) {
				stopWatch.stop();
				executionCost = stopWatch.getTotalTimeMillis();
			}
			SpelEvaluationContext.setVariable(RETURN, result);    // 返回值处理
			events.addAll(parseList(invocation, eventAuditors, false));
			for (AuditingEvent event : events) {
				event.setSuccess(success);
				event.setOperateDate(now);
				event.setExecutionCost(executionCost);
				if (errorMsg != null) {
					event.setThrowable(errorMsg);
				}
			}

			send(events);
			SpelEvaluationContext.remove(); // 清理当前线程变量
		}
		return result;
	}

	/**
	 * 异步开启后需要设置 AsyncTaskExecutor
	 *
	 * @param asyncTaskExecutor 异步任务执行器
	 */
	public void setAsyncTaskExecutor(AsyncTaskExecutor asyncTaskExecutor) {
		this.asyncTaskExecutor = asyncTaskExecutor;
	}

	/**
	 * 发送审计事件
	 *
	 * @param events 审计事件列表
	 */
	private void send(List<AuditingEvent> events) {
		String senderType = eventAuditorConfig.getSender().getSenderType();
		EventSenderBuilder eventSenderBuilder = ExtensionLoader.getExtensionLoader(EventSenderBuilder.class).getExtension(senderType);
		eventSenderBuilder.setEventAuditorConfig(eventAuditorConfig);
		EventSender eventSender = eventSenderBuilder.build();
		if (eventAuditorConfig.getSender().isAsync() && asyncTaskExecutor != null) {
			asyncTaskExecutor.execute(() -> eventSender.send(events));
		} else {
			eventSender.send(events);
		}
	}

	/**
	 * 解析 {@code AuditingEvent} 列表
	 *
	 * @param invocation       方法调用元信息
	 * @param eventAuditors    审计注解
	 * @param evalBeforeInvoke 是否在调用方法之前提前解析
	 * @return {@code AuditingEvent} 列表
	 */
	private List<AuditingEvent> parseList(@NotNull MethodInvocation invocation, EventAuditor[] eventAuditors,
										  boolean evalBeforeInvoke) {
		List<AuditingEvent> events = Lists.newArrayList();
		for (EventAuditor eventAuditor : eventAuditors) {
			if (eventAuditor.evalBeforeInvoke() == evalBeforeInvoke) {
				AuditingEvent auditingEvent = this.parseModel(eventAuditor, invocation);
				if (auditingEvent != null) {
					events.add(auditingEvent);
				}
			}
		}
		return events;
	}

	/**
	 * 解析模型
	 *
	 * @param eventAuditor 事件审计注解
	 * @param invocation   方法调用元信息
	 * @return 目标模型
	 */
	private AuditingEvent parseModel(EventAuditor eventAuditor, MethodInvocation invocation) {
		EvaluationContext context = SpelEvaluationContext.getContext();
		CustomFunctionRegistrar.register((StandardEvaluationContext) context);
		Method method = invocation.getMethod();
		String[] parameterNames = SpelExpressionEvaluator.getParameterNameDiscoverer().getParameterNames(method);
		Object[] arguments = invocation.getArguments();
		if (parameterNames != null) {
			int len = parameterNames.length;
			for (int i = 0; i < len; i++) {
				context.setVariable(parameterNames[i], arguments[i]);
			}
		}

		ExpressionParser parser = SpelExpressionEvaluator.getExpressionParser();
		if (StringUtils.isNotBlank(eventAuditor.condition())) {
			Expression expression = parser.parseExpression(eventAuditor.condition());
			if (!Boolean.TRUE.equals(expression.getValue(context, Boolean.class))) {
				return null;
			}
		}

		AuditingEvent auditingEvent = new AuditingEvent();
		if (StringUtils.isNotBlank(eventAuditor.operator())) {
			Expression expression = parser.parseExpression(eventAuditor.operator());
			auditingEvent.setOperator(expression.getValue(context, String.class));
		}

		if (StringUtils.isNotBlank(eventAuditor.role())) {
			Expression expression = parser.parseExpression(eventAuditor.role());
			auditingEvent.setRole(expression.getValue(context, String.class));
		}

		if (StringUtils.isNotBlank(eventAuditor.bizScenario())) {
			Expression expression = parser.parseExpression(eventAuditor.bizScenario());
			auditingEvent.setBizScenario(expression.getValue(context, String.class));
		}

		if (StringUtils.isNotBlank(eventAuditor.content())) {
			Expression expression = parser.parseExpression(eventAuditor.content());
			auditingEvent.setContent(expression.getValue(context, String.class));
		}

		if (StringUtils.isNotBlank(eventAuditor.extra())) {
			Expression expression = parser.parseExpression(eventAuditor.extra());
			Object extra = expression.getValue(context, Object.class);
			auditingEvent.setExtra(extra instanceof String ? (String) extra : JSONHelper.json().toJSONString(extra));
		}
		return auditingEvent;
	}
}
```

上述代码中有 3 个关键类，分别是：
1. `SpelExpressionEvaluator` ：处理 SpEL 表达式。
2. `CustomFunctionRegistrar`：存储自定义函数和 Java 方法的关联关系，解析自定义函数时，通过缓存找到对应的 Java 方法反射调用。
3. `EventSenderBuilder` ：将事件内容往其他渠道发送，例如消息队列、数据库，便于存储。

接下来依次展开说明。

## SpEL 表达式解析实现

SpEL 是 Spring 特有的表示解析格式，内部通过 `StandardEvaluationContext` 实现，我们可以在这个基础上进行封装。

```java
public class SpelExpressionEvaluator {

	private static final ExpressionParser PARSER = new SpelExpressionParser();

	private static final ParameterNameDiscoverer DISCOVERER = new LocalVariableTableParameterNameDiscoverer();

	public static ExpressionParser getExpressionParser() {
		return PARSER;
	}

	public static ParameterNameDiscoverer getParameterNameDiscoverer() {
		return DISCOVERER;
	}

	/**
	 * 解析 SpEL 表达式
	 *
	 * @param expressionString SpEL 表达式
	 * @param method           方法
	 * @param arguments        参数
	 * @return 解析后的内容
	 */
	public static String parseExpression(String expressionString, Method method, Object[] arguments) {
		String[] params = DISCOVERER.getParameterNames(method);
		if (params != null && params.length > 0) {
			for (int i = 0; i < params.length; i++) {
				SpelEvaluationContext.setVariable(params[i], arguments[i]);
			}
		}

		Expression expression = PARSER.parseExpression(expressionString);
		return expression.getValue(SpelEvaluationContext.getContext(), String.class);
	}
}

public class SpelEvaluationContext {

	private static final TransmittableThreadLocal<EvaluationContext> VARIABLES =
		new TransmittableThreadLocal<EvaluationContext>() {

			@Override
			protected EvaluationContext initialValue() {
				return new StandardEvaluationContext();
			}
		};

	public static EvaluationContext getContext() {
		return VARIABLES.get();
	}

	public static Object lookupVariable(String key) {
		EvaluationContext context = getContext();
		return context.lookupVariable(key);
	}

	public static void setVariable(String key, Object value) {
		EvaluationContext context = getContext();
		context.setVariable(key, value);
		VARIABLES.set(context);
	}

	public static void remove() {
		VARIABLES.remove();
	}
}
```

## 自定义函数解决上下文历史

通过 `MethodInterceptor` 方法拦截只能获取入参和返回值，对于修改内容的场景，没办法获取原始记录。我们引入了 `CustomFunctionRegistrar` 自定义函数，由用户来决定调用哪个 Java 方法。

在应用启动时，基于 Spring 自动扫描所有标记了 `CustomFunctionRegistrar` 的代码，通过 AOP 生成代理，将自定义函数和代理方法的映射存到缓存中，这样就可以通过自定义函数找到代理方法，调用业务指定的逻辑了。

```java
@Slf4j
public class CustomFunctionRegistrar implements ApplicationContextAware {

	private static final Map<String, Method> FUNCTION_CACHE = new ConcurrentHashMap<>();

	/**
	 * 初始化
	 *
	 * @param applicationContext ApplicationContext
	 * @throws BeansException 初始化Bean异常
	 */
	@Override
	public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
		initialize(applicationContext);
	}

	/**
	 * 初始化自定义函数
	 *
	 * @param applicationContext ApplicationContext
	 */
	private void initialize(ApplicationContext applicationContext) {
		Map<String, Object> components = applicationContext.getBeansWithAnnotation(Component.class);
		components.values().forEach(component -> {
			Method[] methods = component.getClass().getMethods();
			if (methods.length == 0) {
				return;
			}

			Object targetObject = AopUtils.getDynamicProxyTargetObject(component);
			for (Method method : methods) {
				CustomFunction annotation = AnnotatedElementUtils.findMergedAnnotation(method, CustomFunction.class);
				if (annotation == null) {
					continue;
				}
				if (ReflectionUtils.isStaticMethod(method)) {
					cache(annotation, method);
					continue;
				}
				ClassPool pool = ClassPool.getDefault();
				Class<?> targetClass = targetObject.getClass();
				String staticallyClassName = targetClass.getName() + "_Statically";
				Class<?> delegateClass;
				CtClass ctClass = pool.getOrNull(staticallyClassName);
				try {
					if (ctClass == null) {
						ctClass = constructCtClass(method, pool, targetClass, staticallyClassName);
						delegateClass = ctClass.toClass();
					} else {
						delegateClass = ctClass.getClass().getClassLoader().loadClass(staticallyClassName);
					}
					Object proxy = delegateClass.getConstructor(targetClass).newInstance(component);
					Method[] proxyMethods = proxy.getClass().getDeclaredMethods();
					Arrays.stream(proxyMethods).forEach(proxyMethod -> {
						if (Arrays.equals(method.getParameterTypes(), proxyMethod.getParameterTypes()) &&
							method.getName().equals(proxyMethod.getName())) {
							cache(annotation, proxyMethod);
						}
					});
				} catch (Exception e) {
					throw new RuntimeException(e);
				}
			}
		});
	}

	/**
	 * 注册自定义函数到 SpEL解析上下文
	 *
	 * @param context SpEL解析上下文
	 */
	public static void register(StandardEvaluationContext context) {
		FUNCTION_CACHE.forEach(context::registerFunction);
	}

	private static void cache(CustomFunction annotation, Method method) {
		String registerName = StringUtils.hasText(annotation.value()) ? annotation.value() : method.getName();
		FUNCTION_CACHE.put(registerName, method);
		log.info("Register custom function '{}' as name '{}'", method, registerName);
	}

	private CtClass constructCtClass(Method method, ClassPool pool, Class<?> targetClass, String staticallyClassName)
		throws NotFoundException, CannotCompileException {
		CtClass ctClass = pool.makeClass(staticallyClassName);
		ctClass.addInterface(pool.get(Serializable.class.getName()));

		CtField field = new CtField(pool.get(targetClass.getName()), "delegating", ctClass);
		field.setModifiers(javassist.Modifier.STATIC | javassist.Modifier.PROTECTED);
		ctClass.addField(field);

		CtConstructor constructor = new CtConstructor(new CtClass[]{pool.get(targetClass.getName())}, ctClass);
		constructor.setBody("{delegating = $1;}");
		ctClass.addConstructor(constructor);

		CtMethod getterMethod = new CtMethod(pool.get(targetClass.getName()), "getDelegating", new CtClass[]{}, ctClass);
		getterMethod.setModifiers(javassist.Modifier.PUBLIC);
		getterMethod.setBody("{return delegating;}");
		ctClass.addMethod(getterMethod);

		int modifier = method.getModifiers();
		modifier |= javassist.Modifier.STATIC;
		String methodName = method.getName();
		Class<?> returnType = method.getReturnType();
		StringBuilder builder = new StringBuilder();
		builder.append(chooseModifier(modifier)).append(" ")
			.append(returnType.getName()).append(" ")
			.append(methodName).append("(");

		Class<?>[] parameterType = method.getParameterTypes();
		StringBuilder params = null;
		for (int i = 0; i < parameterType.length; i++) {
			builder.append(parameterType[i].getName()).append(" ");
			builder.append("$_").append(i).append(",");
			if (params == null) {
				params = new StringBuilder();
			}
			params.append("$_").append(i).append(",");
		}
		if (params != null) {
			builder.delete(builder.length() - 1, builder.length());
			params.delete(params.length() - 1, params.length());
		}
		builder.append(")");
		builder.append("{");
		if (!returnType.equals(void.class)) {
			builder.append("return").append(" ");
		}
		builder.append("delegating.").append(methodName).append("(");
		if (params != null) {
			builder.append(params);
		}
		builder.append(")").append(";");
		builder.append("}");

		CtMethod ctMethod = CtMethod.make(builder.toString(), ctClass);
		ctClass.addMethod(ctMethod);
		return ctClass;
	}

	private String chooseModifier(int modifier) {
		StringBuilder builder = new StringBuilder();
		if ((modifier & javassist.Modifier.PUBLIC) == javassist.Modifier.PUBLIC) {
			builder.append("public").append(" ");
		}
		if ((modifier & javassist.Modifier.PRIVATE) == javassist.Modifier.PRIVATE) {
			builder.append("private").append(" ");
		}
		if ((modifier & javassist.Modifier.PROTECTED) == javassist.Modifier.PROTECTED) {
			builder.append("protected").append(" ");
		}
		if ((modifier & javassist.Modifier.ABSTRACT) == javassist.Modifier.ABSTRACT) {
			builder.append("abstract").append(" ");
		}
		if ((modifier & javassist.Modifier.STATIC) == javassist.Modifier.STATIC) {
			builder.append("static").append(" ");
		}
		if ((modifier & javassist.Modifier.FINAL) == javassist.Modifier.FINAL) {
			builder.append("final").append(" ");
		}
		return builder.toString();
	}
}
```


## 审计事件内容存储实现

拦截到审计信息后，接下来要做的事情就是存储。我们定义了 `EventSender` 接口和 `AuditingEvent` 审计事件模型。

```java
public interface EventSender {

	/**
	 * 发送审计事件列表
	 *
	 * @param events 审计事件列表
	 */
	void send(List<AuditingEvent> events);
}

@Accessors(chain = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@ToString
@Data
public class AuditingEvent {

	/** 操作对象 */
	private String operator;

	/** 操作角色 */
	private String role;

	/** 操作时间 */
	private LocalDateTime operateDate;

	/** 业务场景 */
	private String bizScenario;

	/** 记录内容 */
	private String content;

	/** 额外信息 */
	private String extra;

	/** 返回值 */
	private String returnValue;

	/** 执行耗时 */
	private Long executionCost;

	/** 执行是否成功 */
	private Boolean success;

	/** 异常信息 */
	private String throwable;
}
```

在前面的 `EventAuditorInterceptor#send()` 方法，就是调用了这个接口。

关于接口的实现，我们预留了扩展点，可以本地日志打印、可以发送到 MQ 或者数据库，例如，本地日志打印实现代码。

```java
@RequiredArgsConstructor
@Slf4j
public class LoggingEventSender implements EventSender {

	public static final String AUDITING_EVENT = "Auditing event: {}";

	private final Level level;

	/**
	 * 发送审计事件列表
	 *
	 * @param events 审计事件列表
	 */
	@Override
	public void send(List<AuditingEvent> events) {
		if (CollectionUtils.isEmpty(events)) {
			return;
		}

		List<String> contents = events.stream()
			.map(AuditingEvent::getContent).collect(Collectors.toList());
		switch (level) {
			case DEBUG:
				log.debug(AUDITING_EVENT, contents);
				break;
			case INFO:
				log.info(AUDITING_EVENT, contents);
				break;
			case WARN:
				log.warn(AUDITING_EVENT, contents);
				break;
		}
	}
}
```

为了简化配置，我们基于 `Spring Boot` 的自动装配机制进一步封装。

```java
@ConditionalOnProperty(
	prefix = EventAuditorProperties.PREFIX,
	name = Conditions.ENABLED,
	havingValue = Conditions.TRUE,
	matchIfMissing = true
)
@AutoConfigureAfter(AsyncTaskExecutionAutoConfiguration.class)
@EnableEventAuditor
@EnableConfigurationProperties(EventAuditorProperties.class)
@Slf4j
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Configuration(proxyBeanMethods = false)
public class EventAuditorAutoConfiguration {

}

@Setter
@Getter
@ConfigurationProperties(prefix = EventAuditorProperties.PREFIX)
public class EventAuditorProperties extends EventAuditorConfig {

	public static final String PREFIX = "event-auditor";

	private boolean enabled;
}

@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Slf4j
@Configuration(proxyBeanMethods = false)
public class EventAuditorConfiguration implements ImportAware {

	private AnnotationAttributes enableEventAuditor;

	@Override
	public void setImportMetadata(AnnotationMetadata importMetadata) {
		this.enableEventAuditor = AnnotationAttributes.fromMap(
			importMetadata.getAnnotationAttributes(EnableEventAuditor.class.getName(), false));
		if (this.enableEventAuditor == null) {
			log.warn("@EnableEventAuditor is not present on importing class");
		}
	}

	@Bean
	public EventAuditorInterceptor eventAuditorInterceptor(ObjectProvider<EventAuditorConfig> eventAuditorConfig,
														   ObjectProvider<AsyncTaskExecutor> asyncTaskExecutor) {
		EventAuditorInterceptor interceptor = new EventAuditorInterceptor(eventAuditorConfig.getIfUnique(EventAuditorConfig::new));
		asyncTaskExecutor.ifAvailable(interceptor::setAsyncTaskExecutor);
		return interceptor;
	}

	@Bean
	public EventAuditorPointcutAdvisor eventAuditorPointcutAdvisor(EventAuditorInterceptor eventAuditorInterceptor) {
		EventAuditorPointcutAdvisor pointcutAdvisor = new EventAuditorPointcutAdvisor();
		pointcutAdvisor.setAdviceBeanName("eventAuditorPointcutAdvisor");
		pointcutAdvisor.setAdvice(eventAuditorInterceptor);
		if (enableEventAuditor != null) {
			pointcutAdvisor.setOrder(enableEventAuditor.getNumber("order"));
		}
		return pointcutAdvisor;
	}

	@Bean
	public CustomFunctionRegistrar customFunctionRegistrar() {
		return new CustomFunctionRegistrar();
	}
}

@EqualsAndHashCode
@ToString
@Setter
@Getter
public class EventAuditorConfig {

	private final Sender sender = new Sender();

	@EqualsAndHashCode
	@ToString
	@Setter
	@Getter
	public static class Sender {

		private String senderType = "logging";

		private boolean async = true;

		private final Logging logging = new Logging();

		private final Kafka kafka = new Kafka();

		private final RocketMQ rocketMQ = new RocketMQ();

		@EqualsAndHashCode
		@ToString
		@Setter
		@Getter
		public static class Logging {

			private Level level = Level.INFO;
		}

		@EqualsAndHashCode
		@ToString
		@Setter
		@Getter
		public static class Kafka {

			private String topic;
		}

		@EqualsAndHashCode
		@ToString
		@Setter
		@Getter
		public static class RocketMQ {

			private String topic;

			private String namespace;

			private String tags;

			private String keys;
		}
	}
}
```

从配置类可以看到，我们为消息存储提供了 3 个选项: `Logging` 本地日志、`RocketMQ` 或 `Kafka`。

## 代码使用示例

假设我们在 `UserService#modifyUser()` 修改用户信息，需要记录修改了哪些内容。

```java
@Service("userService")
public class UserServiceImpl implements UserService {

	//...


	/**
	 * 修改用户
	 *
	 * @param cmd
	 */
	@EventAuditor(bizScenario = "'demo.users.getUserById'", operator = "#operator",
		content = "'用户' + #cmd.login + '修改了邮箱，从' + #queryOldEmail(#cmd.id) + '修改为' + #cmd.email")
	@Transactional(rollbackFor = Exception.class)
	@Override
	public Response modifyUser(UserModifyCmd cmd) {
		return userModifyCmdExe.execute(cmd);
	}

	/**
	 * 自定义函数
	 *
	 * @param id 用户ID
	 * @return 数据库值
	 */
	@CustomFunction("queryOldEmail")
	public String queryOldEmail(Long id) {
		return this.getUserById(UserByIdQry.builder().id(id).build()).getData().getEmail();
	}
}
```

对应的 `application.yaml` 配置文件设置如下。

```yaml
event-auditor:
  enabled: true
  sender:
    type: logging
	# type: kafka
	# kafka:
	#   topic: demo
	# type: rocketmq
	# rocketmq:
	#   topic: demo
	#   namespace: test  
```

因为笔者配置了 `event-auditor.sender.type=logging`，所以，审计内容输出到控制台日志，如下图，当调用用户信息更新接口，在控制台打印了 `用户admin修改了邮箱` 字眼。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-event-auditor.png)

# 产出

对业务代码的侵入性极小，扩展性很高，可以轻松实现事件审计的记录，并存储到你想要的位置。

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-event-auditor](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-solutions/eden-event-auditor) 和 [eden-event-auditor-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-event-auditor-spring-boot-starter)。