---
title: MyBatis Interceptor for Raw SQL Parsing
date: 2024-02-02
description: Implement raw SQL statement printing via MyBatis interceptor.
tags:
  - Extension Points
  - Mybatis
  - SQL
  - Cost Optimization
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/MyBatis.png
---

# Background

MyBatis Plus prints SQL via `log-impl` property:

```yaml
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

Default output:

```
==>  Preparing: SELECT id,login,email FROM demo_user WHERE id=?
==> Parameters: 1(Long)
<==  Total: 1
```

Issues with default format:

1. No timestamp - can't quickly locate execution time
2. Poor SQL readability for complex statements
3. High storage cost - SQL template uses many characters

# Objective

Implement raw SQL statement printing via MyBatis interceptor.

# Implementation

Define custom MyBatis interceptor implementing `org.apache.ibatis.plugin.Interceptor`:

```java
@Intercepts({
    @Signature(method = "query", type = Executor.class, args = {MappedStatement.class, Object.class, RowBounds.class, ResultHandler.class}),
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

        if (Duration.ofMillis(duration).compareTo(slownessThreshold) < 0) {
            log.info("{} execute sql: {} ({} ms)", mapperId, originalSql, duration);
        } else {
            log.warn("{} execute sql took more than {} ms: {} ({} ms)",
                mapperId, slownessThreshold.toMillis(), originalSql, duration);
        }
        return result;
    }
}
```

Utility class for parsing MyBatis statements to executable SQL:

```java
@UtilityClass
public class MybatisUtils {

    public String getSql(MappedStatement mappedStatement, Invocation invocation) {
        Object parameter = invocation.getArgs().length > 1 ? invocation.getArgs()[1] : null;
        BoundSql boundSql = mappedStatement.getBoundSql(parameter);
        return resolveSql(mappedStatement.getConfiguration(), boundSql);
    }

    private static String resolveSql(Configuration configuration, BoundSql boundSql) {
        // Replace ? placeholders with actual parameter values
        // Handle different parameter types (String, Date, etc.)
        // ...
    }
}
```

Spring auto-configuration:

```java
@ConditionalOnProperty(name = "mybatis.plugin.sql-log.enabled")
@Configuration(proxyBeanMethods = false)
public class MybatisPluginAutoConfiguration {

    @Bean
    public MybatisSqlLogInterceptor mybatisSqlLogInterceptor() {
        MybatisSqlLogInterceptor interceptor = new MybatisSqlLogInterceptor();
        interceptor.setSlownessThreshold(properties.getSqlLog().getSlownessThreshold());
        return interceptor;
    }
}
```

With `mybatis.plugin.sql-log.enabled=true`, output becomes:

```sql
2024-02-10 23:03:01.845 INFO org.ylzl.eden.demo.infrastructure.user.database.UserMapper.selectById execute sql: SELECT id,login,email FROM demo_user WHERE id=1 (10 ms)
```

This format meets production needs: `timestamp`, `executable SQL`, `execution time`.

# Output

Teams can locate production SQL issues more clearly. Log storage reduced by 30%.

Code is fully open source at [eden-mybatis-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-mybatis-spring-boot-starter).
