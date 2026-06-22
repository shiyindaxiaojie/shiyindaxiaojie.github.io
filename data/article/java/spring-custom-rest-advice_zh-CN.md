---
title: Spring 自定义 @RestControllerAdvice 返回结果
date: 2024-01-05
description: 不需要修改基础框架，允许业务方自行扩展异常返回对象。
tags:
  - 扩展点
  - Spring Boot
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# 背景

Spring 提供了 `@RestControllerAdvice` 用来实现 HTTP 协议的全局异常处理。在异常信息的处理上通常只返回特定的 Response 对象，如下。

```java
@Slf4j
@RestControllerAdvice
public class RestExceptionResolver {

	@ExceptionHandler(Exception.class)
	public ResponseEntity<?> processException(Exception ex) {
		BodyBuilder builder;
		Response response;
		ResponseStatus responseStatus =
			AnnotationUtils.findAnnotation(ex.getClass(), ResponseStatus.class);
		if (responseStatus != null) {
			builder = ResponseEntity.status(responseStatus.value());
			response = Response.buildFailure("500", responseStatus.reason());
		} else {
			builder = ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR);
			response = Response.buildFailure("500", ex.getMessage());
		}
		this.process(ex, response);
		return builder.body(response);
	}
}
```

作为基础框架，笔者就遇到项目A 要求返回 Response1 对象，项目B 要求返回 Response2 对象，这个时候，适配起来就很痛苦，例如下方的代码。

```java
@Slf4j
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
@ToString(callSuper = true)
@Data
public class Response extends DTO {

	private static final long serialVersionUID = 1L;

	private boolean success;

	private String errCode; // 项目A 要求错误码是字符型

	private String errMessage; // 项目A 要求用这个名字

	private int code; // 项目B 要求错误码是整型

	private String message; // 项目B 要求用这个名字
}
```

另外，`@RestControllerAdvice` 只适用于 Web 异常捕获，我们还要考虑其他组件的情况，例如 Dubbo 捕获 RPC 异常、Sentinel 组件触发限流、Spring Security 安全框架抛出认证异常。

# 目标

不需要修改基础框架，允许业务方自行扩展异常返回对象。

# 实现

将 `Response` 提炼为 Builder 模式，改为 `ResponseBuilder.builder()` 构建返回对象。

```java
@Slf4j
@RestControllerAdvice
public class RestExceptionHandler {

	@ExceptionHandler(Exception.class)
	public ResponseEntity<?> resolveException(Exception ex) {
		BodyBuilder builder;
		Object response;
		ResponseStatus status = AnnotationUtils.findAnnotation(ex.getClass(), ResponseStatus.class);
		if (status != null) {
			builder = ResponseEntity.status(status.value());
			response = ResponseBuilder.builder().buildFailure("500", status.reason());
		} else {
			builder = ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR);
			response = ResponseBuilder.builder().buildFailure("500", ex.getMessage());
		}
		this.postProcess(ex);
		return builder.body(response);
	}
}

public interface ResponseBuilder<T> {

	static ResponseBuilder<?> builder() {
		// 尝试从业务项目获取自定义的 Spring Bean
		ResponseBuilder<?> builder = ApplicationContextHelper.getBean(ResponseBuilder.class);
		if (builder != null) {
			return builder;
		}
		// 如果业务项目没有自定义 Bean，返回默认的 Builder
		return DefalutResponseBuilder.getInstance();
	}

	T buildSuccess();

	<Body> T buildSuccess(Body data);

	T buildFailure(String errCode, String errMessage, Object... params);
}

public class DefalutResponseBuilder implements ResponseBuilder<Response> {

    private static final DefaultResponseBuilder INSTANCE = new DefaultResponseBuilder();

    private DefaultResponseBuilder() {}

    public static DefaultResponseBuilder getInstance() {
        return INSTANCE;
    }

	@Override
	public Response buildSuccess() {
		Response response = new Response();
		response.setSuccess(true);
		return response;
	}

	@Override
	public <Body> Response buildSuccess(Body data) {
		SingleResponse<Body> response = new SingleResponse<>();
		response.setSuccess(true);
		response.setData(data);
		return response;
	}

	@Override
	public Response buildFailure(String errCode, String errMessage, Object... params) {
		Response response = new Response();
		response.setSuccess(false);
		response.setErrCode(errCode);
		response.setErrMessage(MessageFormatter.arrayFormat(message, placeholders).getMessage());
		return response;
	}
}

@Slf4j
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
@ToString(callSuper = true)
@Data
public class Response extends DTO {

	private static final long serialVersionUID = 1L;

	private boolean success;

	private String errCode;

	private String errMessage;
}
```

业务方觉得 `Response` 不能满足需求，重新定义了新对象，如下。

```java
@Slf4j
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
@ToString(callSuper = true)
@Data
public class CustomResponse {

	private static final long serialVersionUID = 1L;

	private boolean success;

	private int code; // 要求错误码是整型

	private String message; // 前端要求用这个名字
}

```

创建 `CustomResponseBuilder` 包装 `CustomResponse` 对象，并标记 `@Component` 注解，放入 Spring Bean 管理。

```
@Component
public class CustomResponseBuilder implements ResponseBuilder<CustomResponse> {

	@Override
	public CustomResponse buildSuccess() {
		CustomResponse response = new CustomResponse();
		response.setSuccess(true);
		return response;
	}

	@Override
	public <Body> CustomResponse buildSuccess(Body data) {
		// 略
	}

	@Override
	public CustomResponse buildFailure(int code, String message, Object... params) {
		CustomResponse response = new CustomResponse();
		response.setSuccess(false);
		response.setCode(code);
		response.setMessage(MessageFormatter.arrayFormat(message, placeholders).getMessage());
		return response;
	}
}
```

上述已提到 `ResponseBuilder.builder()` 优先查找 Spring Bean，所以 `CustomResponseBuilder` 覆盖了框架内置的 `DefaultResponseBuilder` 类，全局异常捕获器返回结果时，就能返回业务方自定义的 `CustomResponse` 对象，这样，不需要改动框架，就能满足业务需求。


# 产出

根据这个思路，我们分别实现了 Web 异常、Dubbo 异常、Sentinel 限流、Security 认证等各种场景的异常处理机制，业务方只需要自行创建 `ResponseBuilder` 扩展自己的返回对象即可，不需要修改框架。

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-spring-framework](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-framework/src/main/java/org/ylzl/eden/spring/framework/dto/extension)。