---
title: Spring Custom @RestControllerAdvice Response
date: 2024-01-05
description: Allow business to extend exception response objects without modifying base framework.
tags:
  - Extension Points
  - Spring Boot
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# Background

Spring provides `@RestControllerAdvice` for global HTTP exception handling, typically returning specific Response objects:

```java
@RestControllerAdvice
public class RestExceptionResolver {
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> processException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Response.buildFailure("500", ex.getMessage()));
    }
}
```

As base framework, I encountered Project A requiring Response1 and Project B requiring Response2 - painful to adapt.

Also, `@RestControllerAdvice` only handles Web exceptions - must consider Dubbo RPC exceptions, Sentinel rate limiting, Spring Security authentication errors.

# Objective

Allow business to extend exception response objects without modifying base framework.

# Implementation

Extract `Response` to Builder pattern using `ResponseBuilder.builder()`:

```java
@RestControllerAdvice
public class RestExceptionHandler {
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> resolveException(Exception ex) {
        Object response = ResponseBuilder.builder().buildFailure("500", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}

public interface ResponseBuilder<T> {
    static ResponseBuilder<?> builder() {
        // Try to get custom Spring Bean from business project
        ResponseBuilder<?> builder = ApplicationContextHelper.getBean(ResponseBuilder.class);
        if (builder != null) {
            return builder;
        }
        return DefalutResponseBuilder.getInstance();
    }

    T buildSuccess();
    <Body> T buildSuccess(Body data);
    T buildFailure(String errCode, String errMessage, Object... params);
}
```

Business defines custom response:

```java
@Data
public class CustomResponse {
    private boolean success;
    private int code;      // Integer error code
    private String message; // Frontend requirement
}
```

Create `CustomResponseBuilder` with `@Component`:

```java
@Component
public class CustomResponseBuilder implements ResponseBuilder<CustomResponse> {
    @Override
    public CustomResponse buildSuccess() {
        CustomResponse response = new CustomResponse();
        response.setSuccess(true);
        return response;
    }

    @Override
    public CustomResponse buildFailure(int code, String message, Object... params) {
        CustomResponse response = new CustomResponse();
        response.setSuccess(false);
        response.setCode(code);
        response.setMessage(message);
        return response;
    }
}
```

`ResponseBuilder.builder()` prioritizes Spring Bean lookup, so `CustomResponseBuilder` overrides framework's built-in `DefaultResponseBuilder`. Global exception handler returns business's custom `CustomResponse` without framework modifications.

# Output

Following this approach, implemented exception handling for Web, Dubbo, Sentinel, Security scenarios. Business only creates `ResponseBuilder` extension for custom response objects.

Code is fully open source at [eden-spring-framework](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-framework/src/main/java/org/ylzl/eden/spring/framework/dto/extension).
