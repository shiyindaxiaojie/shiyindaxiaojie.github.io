---
title: Mybatis 拦截器解析原始 SQL 语句
date: 2024-02-02
description: 通过 MyBatis 的拦截器实现 SQL 原始语句的打印。
tags:
  - 扩展点
  - Mybatis
  - SQL
  - 成本优化
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/MyBatis.png
---

# 背景

MyBatis Plus 通过配置文件中设置 `log-impl` 属性来指定日志实现，以打印 SQL 语句。

```yaml
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl

logging:
  level:
    org.ylzl.eden.demo.mapper: DEBUG
```

打印出来的 SQL 内容如下。

```
==>  Preparing: SELECT id,login,email,activated,locked,lang_key,activation_key,reset_key,reset_date,created_by,created_date,last_modified_by,last_modified_date FROM demo_user WHERE id=?
==> Parameters: 1(Long)
<==  Columns: ID, LOGIN, EMAIL, ACTIVATED, LOCKED, LANG_KEY, ACTIVATION_KEY, RESET_KEY, RESET_DATE, CREATED_BY, CREATED_DATE, LAST_MODIFIED_BY, LAST_MODIFIED_DATE
<==  Row: 1, admin, 1813986321@qq.com, TRUE, FALSE, zh-cn, null, null, null, system, 2025-02-10 22:31:03.818, system, null
<==  Total: 1
```

然而，默认的日志输出格式存在以下不足：
1. 缺少日志时间，无法快速定位 SQL 执行时间。
2. SQL 语句可读性差，复杂的 SQL 语句难以阅读。
3. 日志存储成本高：SQL 模板占用较多字符，增加了日志存储成本。

# 目标

通过 MyBatis 的拦截器实现 SQL 原始语句的打印。

# 实现

首先，自定义 MyBatis 拦截器，实现 `org.apache.ibatis.plugin.Interceptor` 接口。

```java
@Intercepts({
	@Signature(method = "query", type = Executor.class, args = {MappedStatement.class, Object.class, RowBounds.class, ResultHandler.class}),
	@Signature(method = "query", type = Executor.class, args = {MappedStatement.class, Object.class, RowBounds.class, ResultHandler.class, CacheKey.class, BoundSql.class}),
	@Signature(method = "update", type = Executor.class, args = {MappedStatement.class, Object.class})
})
public class MybatisSqlLogInterceptor implements Interceptor {

	private static final Logger log = LoggerFactory.getLogger("MybatisSqlLog");

	private Duration slownessThreshold = Duration.ofMillis(1000);

	@Override
	public Object intercept(Invocation invocation) throws Throwable {
		MappedStatement mappedStatement = (MappedStatement) invocation.getArgs()[0];
		String mapperId = mappedStatement.getId();

		String originalSql = MybatisUtils.getSql(mappedStatement, invocation);

		long start = SystemClock.now();
		Object result = invocation.proceed();
		long duration = SystemClock.now() - start;
        // 当 SQL 执行超过我们设置的阈值，转为 WARN 级别 
		if (Duration.ofMillis(duration).compareTo(slownessThreshold) < 0) {
			log.info("{} execute sql: {} ({} ms)", mapperId, originalSql, duration);
		} else {
			log.warn("{} execute sql took more than {} ms: {} ({} ms)", mapperId, slownessThreshold.toMillis(), originalSql, duration);
		}
		return result;
	}

	@Override
	public Object plugin(Object target) {
		if (target instanceof Executor) {
			return Plugin.wrap(target, this);
		}
		return target;
	}

    // 设置慢 SQL 阈值，单位为秒
	public void setSlownessThreshold(Duration slownessThreshold) {
		this.slownessThreshold = slownessThreshold;
	}
}
```

笔者编写了一个工具类负责解析 MyBatis 执行语句，还原为可执行的 SQL 内容。

```java
@UtilityClass
public class MybatisUtils {

    private static final Pattern PARAMETER_PATTERN = Pattern.compile("\\?");

	public String getSql(MappedStatement mappedStatement, Invocation invocation) {
		Object parameter = null;
		if (invocation.getArgs().length > 1) {
			parameter = invocation.getArgs()[1];
		}
		BoundSql boundSql = mappedStatement.getBoundSql(parameter);
		Configuration configuration = mappedStatement.getConfiguration();
		return resolveSql(configuration, boundSql);
	}

	private static String resolveSql(Configuration configuration, BoundSql boundSql) {
		Object parameterObject = boundSql.getParameterObject();
		List<ParameterMapping> parameterMappings = boundSql.getParameterMappings();
		String sql = boundSql.getSql().replaceAll("[\\s]+", " ");
		if (!parameterMappings.isEmpty() && parameterObject != null) {
			TypeHandlerRegistry typeHandlerRegistry = configuration.getTypeHandlerRegistry();
			if (typeHandlerRegistry.hasTypeHandler(parameterObject.getClass())) {
				sql = sql.replaceFirst("\\?", Matcher.quoteReplacement(resolveParameterValue(parameterObject)));

			} else {
				MetaObject metaObject = configuration.newMetaObject(parameterObject);
				Matcher matcher = PARAMETER_PATTERN.matcher(sql);
				StringBuffer sqlBuffer = new StringBuffer();
				for (ParameterMapping parameterMapping : parameterMappings) {
					String propertyName = parameterMapping.getProperty();
					Object obj = null;
					if (metaObject.hasGetter(propertyName)) {
						obj = metaObject.getValue(propertyName);
					} else if (boundSql.hasAdditionalParameter(propertyName)) {
						obj = boundSql.getAdditionalParameter(propertyName);
					}
					if (matcher.find()) {
						matcher.appendReplacement(sqlBuffer, Matcher.quoteReplacement(resolveParameterValue(obj)));
					}
				}
				matcher.appendTail(sqlBuffer);
				sql = sqlBuffer.toString();
			}
		}
		return sql;
	}

	private static String resolveParameterValue(Object obj) {
		if (obj instanceof CharSequence) {
			return "'" + obj + "'";
		}
		if (obj instanceof Date) {
			DateFormat formatter = DateFormat.getDateTimeInstance(DateFormat.DEFAULT, DateFormat.DEFAULT, Locale.CHINA);
			return "'" + formatter.format(obj) + "'";
		}
		return obj == null ? "" : String.valueOf(obj);
	}
}
```

将 MyBatis 拦截器设置为 Spring 自动装配。

```java
@AutoConfigureAfter(DataSourceAutoConfiguration.class)
@ConditionalOnBean(SqlSessionFactory.class)
@ConditionalOnProperty(name = "mybatis.plugin.sql-log.enabled")
@EnableConfigurationProperties({MybatisPluginProperties.class})
@RequiredArgsConstructor
@Slf4j
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Configuration(proxyBeanMethods = false)
public class MybatisPluginAutoConfiguration {

	private final MybatisPluginProperties mybatisPluginProperties;

	@Bean
	public MybatisSqlLogInterceptor mybatisSqlLogInterceptor() {
		MybatisSqlLogInterceptor interceptor = new MybatisSqlLogInterceptor();
		interceptor.setSlownessThreshold(mybatisPluginProperties.getSqlLog().getSlownessThreshold());
		return interceptor;
	}
}

@Data
@ConfigurationProperties(prefix = "mybatis.plugin")
public class MybatisPluginProperties {

	private final SqlLog sqlLog = new SqlLog();

	@Data
	public static class SqlLog {

		private boolean enabled = true;

		private Duration slownessThreshold = Duration.ofMillis(1000);
	}
}
```

当项目配置了属性 `mybatis.plugin.sql-log.enabled=true` 时，SQL 拦截将生效，打印的内容如下。

```sql
2024-02-10 23:03:01.845 INFO  [dev] [XNIO-1 task-1] org.ylzl.eden.demo.infrastructure.user.database.UserMapper.selectById execute sql: SELECT id,login,email,activated,locked,lang_key,activation_key,reset_key,reset_date,created_by,created_date,last_modified_by,last_modified_date FROM demo_user WHERE id=1 (10 ms)
```

这种日志格式比较符合我们实际的生产要求：`提供日志时间`、`可运行的 SQL`、`执行耗时`。

# 产出

团队引入这个组件后，在定位生产 SQL 问题时，比原来清晰多了，并且，日志文件缩减了 30% 存储成本。

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-mybatis-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-mybatis-spring-boot-starter)。