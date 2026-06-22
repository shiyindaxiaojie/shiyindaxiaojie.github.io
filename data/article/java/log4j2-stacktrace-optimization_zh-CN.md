---
title: Log4j2 异常堆栈存储优化
date: 2025-03-15
description: 设计一个轻量级插件，实现异常堆栈倒排，压缩日志内容，零侵入配置。
tags:
  - 扩展点
  - Log4j2
  - 成本优化
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Log4j2.png
---

# 背景

在微服务架构中，日志的完整性和可读性是排查问题的关键。传统日志框架（如Log4j2）默认会输出异常的全部堆栈信息，但在高并发或复杂调用链路场景下，这会导致以下问题：

1. 日志冗余：一次请求产生的完整堆栈可能包含数百行，增加存储和分析成本；
2. 信息过载：开发人员需手动筛选关键堆栈节点，一般只关注最底部的 `Cause By`，影响排查效率；
3. 线程安全：异步线程池中，堆栈信息可能因线程复用而断裂。

因此，需要一个 log4j2 插件来解决这些问题。

# 目标

设计一个轻量级插件，实现异常堆栈倒排，压缩日志内容，零侵入配置。

# 实现

使用 Log4j2 插件提供的扩展点 `LogEventPatternConverter` 进行实现。

## 倒排堆栈

在 `LogEventPatternConverter` 提供的 `format` 方法扩展格式化日志输出。

```java
@Override
public void format(LogEvent event, StringBuilder output) {
  Throwable throwable = event.getThrown();
  if (throwable != null) {
    ForwardCounter counter = new ForwardCounter();
    output.append("\n");
    recursiveReversePrint(throwable, output, counter); // 倒排
  }
}

private void recursiveReversePrint(Throwable throwable, StringBuilder output,
                    ForwardCounter counter) {
  if (throwable == null || counter.value >= causeDepth) {
    return;
  }

  if (throwable.getCause() != null) {
    recursiveReversePrint(throwable.getCause(), output, counter);
  }

  if (counter.value++ < causeDepth) {
    printSingleStack(throwable, output);
  }
}

private void printSingleStack(Throwable throwable, StringBuilder output) {
  output.append(reduceClassName(throwable.getClass().getName()))
    .append(": ")
    .append(throwable.getMessage())
    .append("\n");

  StackTraceElement[] stack = throwable.getStackTrace();
  for (int i = 0; i < Math.min(stackDepth, stack.length); i++) {
    output.append("\tat ")
      .append(formatStackElement(stack[i])) // 压缩堆栈信息，下文会提及到
      .append("\n");
  }

  if (stack.length > stackDepth) {
    output.append("\t... ").append(stack.length - stackDepth)
      .append(" more\n");
  }
}
```

## 压缩内容

将 package 进行压缩，截取首字母，例如 `org.ylzl.framework.extension` 压缩为 `o.y.f.e`。

```java
private static String formatStackElement(StackTraceElement element) {
  return reduceClassName(element.getClassName()) +
    "#" + element.getMethodName() +
    ":" + element.getLineNumber();
}

private static String reduceClassName(String className) {
  String[] parts = className.split("\\.");
  StringBuilder sb = new StringBuilder();
  for (int i = 0; i < parts.length - 1; i++) {
    sb.append(parts[i].charAt(0)).append('.');
  }
  sb.append(parts[parts.length - 1]);
  return sb.toString();
}
```

完整的代码如下。

```java
@Plugin(name = "StackTraceConverter", category = PatternConverter.CATEGORY)
@ConverterKeys({"st", "stacktrace"})
public class StackTraceConverter extends LogEventPatternConverter {

	private static final int DEFAULT_CAUSE_DEPTH = 3;

	private static final int DEFAULT_STACK_DEPTH = 5;

	/** Cause by 深度 */
	private final int causeDepth;

	/** 堆栈深度 */
	private final int stackDepth;

	public StackTraceConverter(int causeDepth, int stackDepth) {
		super("StackTrace", "stacktrace");
		this.causeDepth = causeDepth > 0 ? causeDepth : DEFAULT_CAUSE_DEPTH;
		this.stackDepth = stackDepth > 0 ? stackDepth : DEFAULT_STACK_DEPTH;
	}

	public static StackTraceConverter newInstance(String[] options) {
		int causeDepth = parseOption(options, 0, DEFAULT_CAUSE_DEPTH);
		int stackDepth = parseOption(options, 1, DEFAULT_STACK_DEPTH);
		return new StackTraceConverter(causeDepth, stackDepth);
	}

	private static int parseOption(String[] options, int index, int defaultValue) {
		try {
			if (options != null && options.length > index) {
				return Integer.parseInt(options[index]);
			}
		} catch (NumberFormatException ignored) {
		}
		return defaultValue;
	}

	@Override
	public void format(LogEvent event, StringBuilder output) {
		Throwable throwable = event.getThrown();
		if (throwable != null) {
			ForwardCounter counter = new ForwardCounter();
			output.append("\n");
			recursiveReversePrint(throwable, output, counter);
		}
	}

	private void recursiveReversePrint(Throwable throwable, StringBuilder output,
									   ForwardCounter counter) {
		if (throwable == null || counter.value >= causeDepth) {
			return;
		}

		if (throwable.getCause() != null) {
			recursiveReversePrint(throwable.getCause(), output, counter);
		}

		if (counter.value++ < causeDepth) {
			printSingleStack(throwable, output);
		}
	}

	private void printSingleStack(Throwable throwable, StringBuilder output) {
		output.append(reduceClassName(throwable.getClass().getName()))
			.append(": ")
			.append(throwable.getMessage())
			.append("\n");

		StackTraceElement[] stack = throwable.getStackTrace();
		for (int i = 0; i < Math.min(stackDepth, stack.length); i++) {
			output.append("\tat ")
				.append(formatStackElement(stack[i]))
				.append("\n");
		}

		if (stack.length > stackDepth) {
			output.append("\t... ").append(stack.length - stackDepth)
				.append(" more\n");
		}
	}

	private static String formatStackElement(StackTraceElement element) {
		return reduceClassName(element.getClassName()) +
			"#" + element.getMethodName() +
			":" + element.getLineNumber();
	}

	private static String reduceClassName(String className) {
		String[] parts = className.split("\\.");
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < parts.length - 1; i++) {
			sb.append(parts[i].charAt(0)).append('.');
		}
		sb.append(parts[parts.length - 1]);
		return sb.toString();
	}

	private static class ForwardCounter {
		private int value = 0;
	}
}
```

其中，`@ConverterKeys({"st", "stacktrace"})` 这一行用于配置 log4j2 配置文件的占位符。例如，我们的 log4j2.yml 文件如下。

```yaml
Configuration:
  status: WARN
  monitorInterval: 30

  Properties:
    Property:
      - name: APP_NAME
        value: $${spring:spring.application.name:-eden-demo-cola}
      - name: PROFILES
        value: $${spring:spring.profiles.active}
      - name: LOG_PATH
        value: $${spring:logging.file.path:-/app/logs}
      - name: LOG_PATTERN
        value: "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [${PROFILES}] [%t] [%X{traceId}] %msg%n%throwable"

  Appenders:
    Console:
      name: STDOUT
      target: SYSTEM_OUT
      PatternLayout:
        pattern: ${LOG_PATTERN}
      Filters:
        ThresholdFilter:
          level: INFO
          onMatch: ACCEPT
          onMismatch: DENY
        BurstFilter:
          level: INFO
          rate: 1000
          maxBurst: 10000

  Loggers:
    Root:
      level: INFO
      includeLocation: false
      AppenderRef:
        - ref: STDOUT
```

我们只需要把 `%throwable` 替换为 `%stacktrace{3,5}`，表示对象的堆栈进行倒排，Cause 深度为 3，栈的深度为 5。

## 效果验证

笔者在 log4j2.yaml 的 pattern 设置了 `before%n%throwable%nafter%n%stacktrace{3,5}`，将默认的 `%throwable` 和优化后的 `%stacktrace{3,5}` 进行对比，如下。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/log4j2/log4j2-stacktrace.png)

好了，发起一次不正常的请求测试日志输出情况。

优化前的 `%throwable` 日志输出如下，累计 193 行。

```txt
org.mybatis.spring.MyBatisSystemException: nested exception is org.apache.ibatis.exceptions.PersistenceException: 
### Error updating database.  Cause: java.lang.RuntimeException: java.lang.reflect.InvocationTargetException
### The error may involve org.ylzl.eden.demo.infrastructure.user.database.UserMapper.insert-Inline
### The error occurred while setting parameters
### SQL: INSERT INTO demo_user  ( id, login,  email )  VALUES (  ?, ?,  ?  )
### Cause: java.lang.RuntimeException: java.lang.reflect.InvocationTargetException
	at org.mybatis.spring.MyBatisExceptionTranslator.translateExceptionIfPossible(MyBatisExceptionTranslator.java:97)
	at org.mybatis.spring.SqlSessionTemplate$SqlSessionInterceptor.invoke(SqlSessionTemplate.java:439)
	at com.sun.proxy.$Proxy148.insert(Unknown Source)
	at org.mybatis.spring.SqlSessionTemplate.insert(SqlSessionTemplate.java:272)
	at com.baomidou.mybatisplus.core.override.MybatisMapperMethod.execute(MybatisMapperMethod.java:59)
	at com.baomidou.mybatisplus.core.override.MybatisMapperProxy$PlainMethodInvoker.invoke(MybatisMapperProxy.java:152)
	at com.baomidou.mybatisplus.core.override.MybatisMapperProxy.invoke(MybatisMapperProxy.java:89)
	at com.sun.proxy.$Proxy149.insert(Unknown Source)
	at org.ylzl.eden.demo.infrastructure.user.gateway.UserGatewayImpl.save(UserGatewayImpl.java:49)
	at org.ylzl.eden.demo.infrastructure.user.gateway.UserGatewayImpl$$FastClassBySpringCGLIB$$d8b0b6f3.invoke(<generated>)
	at org.springframework.cglib.proxy.MethodProxy.invoke(MethodProxy.java:218)
	at org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.invokeJoinpoint(CglibAopProxy.java:783)
	at org.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:163)
	at org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.proceed(CglibAopProxy.java:753)
	at org.springframework.dao.support.PersistenceExceptionTranslationInterceptor.invoke(PersistenceExceptionTranslationInterceptor.java:137)
	at org.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:186)
	at org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.proceed(CglibAopProxy.java:753)
	at org.springframework.aop.framework.CglibAopProxy$DynamicAdvisedInterceptor.intercept(CglibAopProxy.java:698)
	at org.ylzl.eden.demo.infrastructure.user.gateway.UserGatewayImpl$$EnhancerBySpringCGLIB$$f587547c.save(<generated>)
	at org.ylzl.eden.demo.app.user.executor.command.UserAddCmdExe.execute(UserAddCmdExe.java:45)
	at org.ylzl.eden.demo.app.user.service.UserServiceImpl.createUser(UserServiceImpl.java:69)
	at org.ylzl.eden.demo.app.user.service.UserServiceImpl$$FastClassBySpringCGLIB$$f054739f.invoke(<generated>)
	at org.springframework.cglib.proxy.MethodProxy.invoke(MethodProxy.java:218)
	at org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.invokeJoinpoint(CglibAopProxy.java:783)
	at org.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:163)
	at org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.proceed(CglibAopProxy.java:753)
	at org.springframework.transaction.interceptor.TransactionInterceptor$1.proceedWithInvocation(TransactionInterceptor.java:123)
	at org.springframework.transaction.interceptor.TransactionAspectSupport.invokeWithinTransaction(TransactionAspectSupport.java:388)
	at org.springframework.transaction.interceptor.TransactionInterceptor.invoke(TransactionInterceptor.java:119)
	at org.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:186)
	at org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.proceed(CglibAopProxy.java:753)
	at org.springframework.aop.framework.CglibAopProxy$DynamicAdvisedInterceptor.intercept(CglibAopProxy.java:698)
	at org.ylzl.eden.demo.app.user.service.UserServiceImpl$$EnhancerBySpringCGLIB$$ab23bab3.createUser(<generated>)
	at org.ylzl.eden.demo.adapter.user.web.UserController.createUser(UserController.java:58)
	at org.ylzl.eden.demo.adapter.user.web.UserController$$FastClassBySpringCGLIB$$3ab5b0e1.invoke(<generated>)
	at org.springframework.cglib.proxy.MethodProxy.invoke(MethodProxy.java:218)
	at org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.invokeJoinpoint(CglibAopProxy.java:783)
	at org.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:163)
	at org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.proceed(CglibAopProxy.java:753)
	at org.ylzl.eden.spring.framework.logging.access.aop.AccessLogInterceptor.invoke(AccessLogInterceptor.java:66)
	at org.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:186)
	at org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.proceed(CglibAopProxy.java:753)
	at org.springframework.aop.interceptor.ExposeInvocationInterceptor.invoke(ExposeInvocationInterceptor.java:97)
	at org.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:186)
	at org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.proceed(CglibAopProxy.java:753)
	at org.springframework.aop.framework.CglibAopProxy$DynamicAdvisedInterceptor.intercept(CglibAopProxy.java:698)
	at org.ylzl.eden.demo.adapter.user.web.UserController$$EnhancerBySpringCGLIB$$64eb74d9.createUser(<generated>)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:205)
	at org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:150)
	at org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:117)
	at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandlerMethod(RequestMappingHandlerAdapter.java:895)
	at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal(RequestMappingHandlerAdapter.java:808)
	at org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle(AbstractHandlerMethodAdapter.java:87)
	at org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:1067)
	at org.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:963)
	at org.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1006)
	at org.springframework.web.servlet.FrameworkServlet.doPost(FrameworkServlet.java:909)
	at javax.servlet.http.HttpServlet.service(HttpServlet.java:517)
	at org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:883)
	at javax.servlet.http.HttpServlet.service(HttpServlet.java:584)
	at io.undertow.servlet.handlers.ServletHandler.handleRequest(ServletHandler.java:74)
	at io.undertow.servlet.handlers.FilterHandler$FilterChainImpl.doFilter(FilterHandler.java:129)
	at org.ylzl.eden.spring.framework.logging.bootstrap.filter.BootstrapLogHttpFilter.doFilter(BootstrapLogHttpFilter.java:70)
	at javax.servlet.http.HttpFilter.doFilter(HttpFilter.java:97)
	at io.undertow.servlet.core.ManagedFilter.doFilter(ManagedFilter.java:61)
	at io.undertow.servlet.handlers.FilterHandler$FilterChainImpl.doFilter(FilterHandler.java:131)
	at org.ylzl.eden.spring.integration.cat.integration.web.HttpCatFilter.logTransaction(HttpCatFilter.java:167)
	at org.ylzl.eden.spring.integration.cat.integration.web.HttpCatFilter.doFilter(HttpCatFilter.java:143)
	at io.undertow.servlet.core.ManagedFilter.doFilter(ManagedFilter.java:61)
	at io.undertow.servlet.handlers.FilterHandler$FilterChainImpl.doFilter(FilterHandler.java:131)
	at org.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:100)
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:119)
	at io.undertow.servlet.core.ManagedFilter.doFilter(ManagedFilter.java:61)
	at io.undertow.servlet.handlers.FilterHandler$FilterChainImpl.doFilter(FilterHandler.java:131)
	at org.springframework.web.filter.FormContentFilter.doFilterInternal(FormContentFilter.java:93)
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:119)
	at io.undertow.servlet.core.ManagedFilter.doFilter(ManagedFilter.java:61)
	at io.undertow.servlet.handlers.FilterHandler$FilterChainImpl.doFilter(FilterHandler.java:131)
	at org.springframework.boot.actuate.metrics.web.servlet.WebMvcMetricsFilter.doFilterInternal(WebMvcMetricsFilter.java:97)
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:119)
	at io.undertow.servlet.core.ManagedFilter.doFilter(ManagedFilter.java:61)
	at io.undertow.servlet.handlers.FilterHandler$FilterChainImpl.doFilter(FilterHandler.java:131)
	at org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:201)
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:119)
	at io.undertow.servlet.core.ManagedFilter.doFilter(ManagedFilter.java:61)
	at io.undertow.servlet.handlers.FilterHandler$FilterChainImpl.doFilter(FilterHandler.java:131)
	at io.undertow.servlet.handlers.FilterHandler.handleRequest(FilterHandler.java:84)
	at io.undertow.servlet.handlers.security.ServletSecurityRoleHandler.handleRequest(ServletSecurityRoleHandler.java:62)
	at io.undertow.servlet.handlers.ServletChain$1.handleRequest(ServletChain.java:68)
	at io.undertow.servlet.handlers.ServletDispatchingHandler.handleRequest(ServletDispatchingHandler.java:36)
	at io.undertow.servlet.handlers.RedirectDirHandler.handleRequest(RedirectDirHandler.java:68)
	at io.undertow.servlet.handlers.security.SSLInformationAssociationHandler.handleRequest(SSLInformationAssociationHandler.java:117)
	at io.undertow.servlet.handlers.security.ServletAuthenticationCallHandler.handleRequest(ServletAuthenticationCallHandler.java:57)
	at io.undertow.server.handlers.PredicateHandler.handleRequest(PredicateHandler.java:43)
	at io.undertow.security.handlers.AbstractConfidentialityHandler.handleRequest(AbstractConfidentialityHandler.java:46)
	at io.undertow.servlet.handlers.security.ServletConfidentialityConstraintHandler.handleRequest(ServletConfidentialityConstraintHandler.java:64)
	at io.undertow.security.handlers.AuthenticationMechanismsHandler.handleRequest(AuthenticationMechanismsHandler.java:60)
	at io.undertow.servlet.handlers.security.CachedAuthenticatedSessionHandler.handleRequest(CachedAuthenticatedSessionHandler.java:77)
	at io.undertow.security.handlers.AbstractSecurityContextAssociationHandler.handleRequest(AbstractSecurityContextAssociationHandler.java:43)
	at io.undertow.server.handlers.PredicateHandler.handleRequest(PredicateHandler.java:43)
	at io.undertow.servlet.handlers.SendErrorPageHandler.handleRequest(SendErrorPageHandler.java:52)
	at io.undertow.server.handlers.PredicateHandler.handleRequest(PredicateHandler.java:43)
	at io.undertow.servlet.handlers.ServletInitialHandler.handleFirstRequest(ServletInitialHandler.java:280)
	at io.undertow.servlet.handlers.ServletInitialHandler.access$100(ServletInitialHandler.java:79)
	at io.undertow.servlet.handlers.ServletInitialHandler$2.call(ServletInitialHandler.java:134)
	at io.undertow.servlet.handlers.ServletInitialHandler$2.call(ServletInitialHandler.java:131)
	at io.undertow.servlet.core.ServletRequestContextThreadSetupAction$1.call(ServletRequestContextThreadSetupAction.java:48)
	at io.undertow.servlet.core.ContextClassLoaderSetupAction$1.call(ContextClassLoaderSetupAction.java:43)
	at io.undertow.servlet.handlers.ServletInitialHandler.dispatchRequest(ServletInitialHandler.java:260)
	at io.undertow.servlet.handlers.ServletInitialHandler.access$000(ServletInitialHandler.java:79)
	at io.undertow.servlet.handlers.ServletInitialHandler$1.handleRequest(ServletInitialHandler.java:100)
	at io.undertow.server.Connectors.executeRootHandler(Connectors.java:387)
	at io.undertow.server.HttpServerExchange$1.run(HttpServerExchange.java:852)
	at org.jboss.threads.ContextClassLoaderSavingRunnable.run(ContextClassLoaderSavingRunnable.java:35)
	at org.jboss.threads.EnhancedQueueExecutor.safeRun(EnhancedQueueExecutor.java:2019)
	at org.jboss.threads.EnhancedQueueExecutor$ThreadBody.doRunTask(EnhancedQueueExecutor.java:1558)
	at org.jboss.threads.EnhancedQueueExecutor$ThreadBody.run(EnhancedQueueExecutor.java:1449)
	at org.xnio.XnioWorker$WorkerThreadFactory$1$1.run(XnioWorker.java:1280)
	at java.lang.Thread.run(Thread.java:748)
Caused by: org.apache.ibatis.exceptions.PersistenceException: 
### Error updating database.  Cause: java.lang.RuntimeException: java.lang.reflect.InvocationTargetException
### The error may involve org.ylzl.eden.demo.infrastructure.user.database.UserMapper.insert-Inline
### The error occurred while setting parameters
### SQL: INSERT INTO demo_user  ( id, login,  email )  VALUES (  ?, ?,  ?  )
### Cause: java.lang.RuntimeException: java.lang.reflect.InvocationTargetException
	at org.apache.ibatis.exceptions.ExceptionFactory.wrapException(ExceptionFactory.java:30)
	at org.apache.ibatis.session.defaults.DefaultSqlSession.update(DefaultSqlSession.java:199)
	at org.apache.ibatis.session.defaults.DefaultSqlSession.insert(DefaultSqlSession.java:184)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at org.mybatis.spring.SqlSessionTemplate$SqlSessionInterceptor.invoke(SqlSessionTemplate.java:425)
	... 121 more
Caused by: java.lang.RuntimeException: java.lang.reflect.InvocationTargetException
	at org.ylzl.eden.spring.integration.cat.integration.mybatis.MybatisCatInterceptor.intercept(MybatisCatInterceptor.java:70)
	at org.apache.ibatis.plugin.Plugin.invoke(Plugin.java:59)
	at com.sun.proxy.$Proxy185.update(Unknown Source)
	at org.apache.ibatis.session.defaults.DefaultSqlSession.update(DefaultSqlSession.java:197)
	... 127 more
Caused by: java.lang.reflect.InvocationTargetException
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at org.apache.ibatis.plugin.Invocation.proceed(Invocation.java:61)
	at org.ylzl.eden.spring.integration.cat.integration.mybatis.MybatisCatInterceptor.intercept(MybatisCatInterceptor.java:64)
	... 130 more
Caused by: org.h2.jdbc.JdbcSQLIntegrityConstraintViolationException: Unique index or primary key violation: "PRIMARY KEY ON PUBLIC.DEMO_USER(ID) [1, 'admin', '{bcrypt}$2a$10$gSAhZrxMllrbgj/kkK9UceBPpChGWJA7SYIb1Mqo.n5aNLq1/oRrC', '1813******@qq.com|FCBD1399F72052DCB729247191079CFC', TRUE, FALSE, 'zh-cn', NULL, NULL, NULL, 'system', TIMESTAMP '2025-03-19 17:07:31.328', 'system', NULL]"; SQL statement:
INSERT INTO demo_user  ( id, login,  email )  VALUES (  ?, ?,  ?  ) [23505-200]
	at org.h2.message.DbException.getJdbcSQLException(DbException.java:459)
	at org.h2.message.DbException.getJdbcSQLException(DbException.java:429)
	at org.h2.message.DbException.get(DbException.java:205)
	at org.h2.message.DbException.get(DbException.java:181)
	at org.h2.mvstore.db.MVPrimaryIndex.add(MVPrimaryIndex.java:127)
	at org.h2.mvstore.db.MVTable.addRow(MVTable.java:531)
	at org.h2.command.dml.Insert.insertRows(Insert.java:195)
	at org.h2.command.dml.Insert.update(Insert.java:151)
	at org.h2.command.CommandContainer.update(CommandContainer.java:198)
	at org.h2.command.Command.executeUpdate(Command.java:251)
	at org.h2.jdbc.JdbcPreparedStatement.execute(JdbcPreparedStatement.java:240)
	at com.zaxxer.hikari.pool.ProxyPreparedStatement.execute(ProxyPreparedStatement.java:44)
	at com.zaxxer.hikari.pool.HikariProxyPreparedStatement.execute(HikariProxyPreparedStatement.java)
	at org.apache.ibatis.executor.statement.PreparedStatementHandler.update(PreparedStatementHandler.java:48)
	at org.apache.ibatis.executor.statement.RoutingStatementHandler.update(RoutingStatementHandler.java:75)
	at org.apache.ibatis.executor.SimpleExecutor.doUpdate(SimpleExecutor.java:50)
	at org.apache.ibatis.executor.BaseExecutor.update(BaseExecutor.java:117)
	at org.apache.ibatis.executor.CachingExecutor.update(CachingExecutor.java:76)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at org.apache.ibatis.plugin.Plugin.invoke(Plugin.java:61)
	at com.sun.proxy.$Proxy185.update(Unknown Source)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at org.apache.ibatis.plugin.Invocation.proceed(Invocation.java:61)
	at org.ylzl.eden.spring.data.mybatis.plugin.MybatisSqlLogInterceptor.intercept(MybatisSqlLogInterceptor.java:64)
	at org.apache.ibatis.plugin.Plugin.invoke(Plugin.java:59)
	at com.sun.proxy.$Proxy185.update(Unknown Source)
	... 136 more
```

优化后的 `%%stacktrace{3,5}` 日志输出如下，累计 22 行。基于倒排的优势，在前面几行，我们马上就能定位到 Cause by 原因了。

```txt
o.h.j.JdbcSQLIntegrityConstraintViolationException: Unique index or primary key violation: "PRIMARY KEY ON PUBLIC.DEMO_USER(ID) [1, 'admin', '{bcrypt}$2a$10$gSAhZrxMllrbgj/kkK9UceBPpChGWJA7SYIb1Mqo.n5aNLq1/oRrC', '1813******@qq.com|FCBD1399F72052DCB729247191079CFC', TRUE, FALSE, 'zh-cn', NULL, NULL, NULL, 'system', TIMESTAMP '2025-03-19 17:07:31.328', 'system', NULL]"; SQL statement:
INSERT INTO demo_user  ( id, login,  email )  VALUES (  ?, ?,  ?  ) [23505-200]
	at o.h.m.DbException#getJdbcSQLException:459
	at o.h.m.DbException#getJdbcSQLException:429
	at o.h.m.DbException#get:205
	at o.h.m.DbException#get:181
	at o.h.m.d.MVPrimaryIndex#add:127
	... 163 more
j.l.r.InvocationTargetException: null
	at s.r.NativeMethodAccessorImpl#invoke0:-2
	at s.r.NativeMethodAccessorImpl#invoke:62
	at s.r.DelegatingMethodAccessorImpl#invoke:43
	at j.l.r.Method#invoke:498
	at o.a.i.p.Invocation#proceed:61
	... 131 more
j.l.RuntimeException: java.lang.reflect.InvocationTargetException
	at o.y.e.s.i.c.i.m.MybatisCatInterceptor#intercept:70
	at o.a.i.p.Plugin#invoke:59
	at c.s.p.$Proxy185#update:-1
	at o.a.i.s.d.DefaultSqlSession#update:197
	at o.a.i.s.d.DefaultSqlSession#insert:184
	... 126 more
```

现在发起 1000 次请求，可以看到优化前产生了 22W 行（下图右侧），优化后减少到 3W 行（下图左侧）。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/log4j2/log4j2-throwable_vs_stacktrace_line.png)

对应的体积变化，优化前占用 20MB，优化后只占用 2MB，缩减了 10 倍。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/log4j2/log4j2-throwable_vs_stacktrace_size.png)

# 产出

本次改动没有任何代码侵入，研发团队只需要在 log4j2.yml 微调 pattern，就可以将日志的占用空间缩减 10 倍，并且，在排查问题只需要关注第一段堆栈的信息，就能定位到业务代码问题。

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-spring-framework](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-framework) 的 `StackTraceConverter` 类。