---
title: Implementing Custom Audit Functionality with Spring Boot
date: 2024-02-11
description: Provide custom annotations to the business side to implement out-of-the-box event audit storage functions.
tags:
  - Extension Point
  - Spring
  - Spring Boot
  - Custom Audit
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# Background

In modern application systems, event auditing is a crucial function. By recording user operational behaviors, we can track issues, analyze user behavior, and even provide key evidence when security issues arise. Since there is currently no good event auditing framework, I decided to implement a set of extensible event auditing components, requiring low intrusion into the business and easy acquisition of content before and after changes.

# Goal

Provide custom annotations to the business side to implement out-of-the-box event audit storage functions.

# Implementation

## Auditing

We defined the `@EventAuditor` annotation, with key fields including `operator` (operator), `content` (operation content template), `bizScenario` (scenario where the event occurs), etc.

```java
@Documented
@Inherited
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface EventAuditor {

	/**
	 * Operation object, supports SpEL expressions
	 *
	 * @return Operation object
	 */
	String operator() default Strings.EMPTY;

	/**
	 * Operation role, supports SpEL expressions
	 * <br/> Used to distinguish between operators and users
	 *
	 * @return Operation role
	 */
	String role() default Strings.EMPTY;

	/**
	 * Business scenario, supports SpEL expressions
	 * <br/> Recommended style: product line + use case + scenario
	 *
	 * @return Business scenario
	 */
	String bizScenario() default Strings.EMPTY;

	/**
	 * Record content
	 *
	 * @return Record content, supports SpEL expressions
	 */
	String content() default Strings.EMPTY;

	/**
	 * Extra information
	 * <br/> Prevent the recorded content from being too long to display, serialize and save separately
	 *
	 * @return Extra information, supports SpEL expressions
	 */
	String extra() default Strings.EMPTY;

	/**
	 * Trigger condition
	 *
	 * @return Trigger condition, empty means default trigger
	 */
	String condition() default Strings.EMPTY;

	/**
	 * Parse SpEL parameters before calling the method
	 * <br/>
	 *
	 * @return Whether to parse in advance
	 */
	boolean evalBeforeInvoke() default true;

	/**
	 * Whether to record the return value
	 * <br/> Prevent recording large List objects returned by query classes leading to OOM
	 *
	 * @return Whether to record
	 */
	boolean recordReturnValue() default false;
}
```

Through Spring's `MethodInterceptor`, we implemented `EventAuditorInterceptor` to capture the `@EventAuditor` annotation and perform audit recording before and after method invocation.

```java
@RequiredArgsConstructor
@Slf4j
public class EventAuditorInterceptor implements MethodInterceptor {

	private static final String RETURN = "_return";

	private static final String ERROR_MSG = "_errorMsg";

	private final EventAuditorConfig eventAuditorConfig;

	private AsyncTaskExecutor asyncTaskExecutor;

	/**
	 * Method invocation interception processing
	 *
	 * @param invocation Method invocation meta information
	 * @return Return value
	 * @throws Throwable Exception
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
			// If parsing exception, execute directly and return
			return invocation.proceed();
		}

		List<AuditingEvent> events = Lists.newArrayList();
		events.addAll(parseList(invocation, eventAuditors, true));

		Object result = null;
		boolean success = true;
		long executionCost = 0L;
		String errorMsg = null;
		// Execution time
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
			SpelEvaluationContext.setVariable(ERROR_MSG, errorMsg);    // Exception information
			throw e;
		} finally {
			if (stopWatch.isRunning()) {
				stopWatch.stop();
				executionCost = stopWatch.getTotalTimeMillis();
			}
			SpelEvaluationContext.setVariable(RETURN, result);    // Return value processing
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
			SpelEvaluationContext.remove(); // Clear current thread variables
		}
		return result;
	}

	/**
	 * Need to set AsyncTaskExecutor after async is enabled
	 *
	 * @param asyncTaskExecutor Asynchronous task executor
	 */
	public void setAsyncTaskExecutor(AsyncTaskExecutor asyncTaskExecutor) {
		this.asyncTaskExecutor = asyncTaskExecutor;
	}

	/**
	 * Send audit events
	 *
	 * @param events Audit event list
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
	 * Parse {@code AuditingEvent} list
	 *
	 * @param invocation       Method invocation meta information
	 * @param eventAuditors    Audit annotations
	 * @param evalBeforeInvoke Whether to parse in advance before calling the method
	 * @return {@code AuditingEvent} list
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
	 * Parse model
	 *
	 * @param eventAuditor Event audit annotation
	 * @param invocation   Method invocation meta information
	 * @return Target model
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

There are 3 key classes in the above code, namely:

1. `SpelExpressionEvaluator`: Processes SpEL expressions.
2. `CustomFunctionRegistrar`: Stores the relationship between custom functions and Java methods. When parsing custom functions, it finds the corresponding Java method reflection call through the cache.
3. `EventSenderBuilder`: Sends event content to other channels, such as message queues and databases, for storage.

Next, I will explain them one by one.

## SpEL Expression Parsing Implementation

SpEL is a unique expression parsing format of Spring, implemented internally through `StandardEvaluationContext`. We can encapsulate on this basis.

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
	 * Parse SpEL expression
	 *
	 * @param expressionString SpEL expression
	 * @param method           Method
	 * @param arguments        Arguments
	 * @return Parsed content
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

## Custom Function to Solve Context History

Through `MethodInterceptor` method interception, we can only get input parameters and return values. For scenarios where content modifications are made, we cannot get the original record. We introduced `CustomFunctionRegistrar` custom function, where the user decides which Java method to call.

Specifically, at application startup, based on Spring, it automatically scans all code marked with `CustomFunctionRegistrar`, generates proxies through AOP, and saves the mapping of custom functions and proxy methods to the cache, so that the proxy method can be found through the custom function and the business-specified logic can be called.

```java
@Slf4j
public class CustomFunctionRegistrar implements ApplicationContextAware {

	private static final Map<String, Method> FUNCTION_CACHE = new ConcurrentHashMap<>();

	/**
	 * Initialize
	 *
	 * @param applicationContext ApplicationContext
	 * @throws BeansException Initialize Bean Exception
	 */
	@Override
	public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
		initialize(applicationContext);
	}

	/**
	 * Initialize custom function
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
	 * Register custom function to SpEL parsing context
	 *
	 * @param context SpEL parsing context
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

## Audit Event Content Storage Implementation

After intercepting the audit information, the next thing to do is store it. We defined the `EventSender` interface and the `AuditingEvent` audit event model.

```java
public interface EventSender {

	/**
	 * Send audit event list
	 *
	 * @param events Audit event list
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

	/** Operation object */
	private String operator;

	/** Operation role */
	private String role;

	/** Operation time */
	private LocalDateTime operateDate;

	/** Business scenario */
	private String bizScenario;

	/** Record content */
	private String content;

	/** Extra information */
	private String extra;

	/** Return value */
	private String returnValue;

	/** Execution cost */
	private Long executionCost;

	/** Execution success */
	private Boolean success;

	/** Exception information */
	private String throwable;
}
```

In the previous `EventAuditorInterceptor#send()` method, this interface was called.

Regarding the implementation of the interface, we reserved extension points, which can be local log printing, or sending to MQ or database. For example, local log printing implementation code.

```java
@RequiredArgsConstructor
@Slf4j
public class LoggingEventSender implements EventSender {

	public static final String AUDITING_EVENT = "Auditing event: {}";

	private final Level level;

	/**
	 * Send audit event list
	 *
	 * @param events Audit event list
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

To simplify configuration, we further encapsulated based on the `Spring Boot` automatic assembly mechanism.

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

From the configuration class, we can see that we have provided 3 options for message storage: `Logging` local log, `RocketMQ` or `Kafka`.

## Code Usage Example

Suppose we modify user information in `UserService#modifyUser()`, we need to record what content has been modified.

```java
@Service("userService")
public class UserServiceImpl implements UserService {

	//...


	/**
	 * Modify user
	 *
	 * @param cmd
	 */
	@EventAuditor(bizScenario = "'demo.users.getUserById'", operator = "#operator",
		content = "'User ' + #cmd.login + ' modified email from ' + #queryOldEmail(#cmd.id) + ' to ' + #cmd.email")
	@Transactional(rollbackFor = Exception.class)
	@Override
	public Response modifyUser(UserModifyCmd cmd) {
		return userModifyCmdExe.execute(cmd);
	}

	/**
	 * Custom function
	 *
	 * @param id User ID
	 * @return Database value
	 */
	@CustomFunction("queryOldEmail")
	public String queryOldEmail(Long id) {
		return this.getUserById(UserByIdQry.builder().id(id).build()).getData().getEmail();
	}
}
```

The corresponding `application.yaml` configuration file is set as follows.

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

Since I configured `event-auditor.sender.type=logging`, the audit content is output to the console log. As shown in the figure below, when the user information update interface is called, the words `User admin modified email` are printed on the console.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-event-auditor.png)

# Output

The intrusion into business code is minimal, and the extensibility is very high. It is easy to record event audits and store them in the location you want.

The code involved in this article is completely open source. Interested partners can check [eden-event-auditor](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-solutions/eden-event-auditor) and [eden-event-auditor-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-event-auditor-spring-boot-starter).
