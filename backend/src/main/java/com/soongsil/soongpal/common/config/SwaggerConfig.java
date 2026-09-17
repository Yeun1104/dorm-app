package com.soongsil.soongpal.common.config;

import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        Info info = new Info()
                .title("SoongPal API 문서")
                .version("v1.0.0")
                .description("숭실대학교 학생들을 위한 공동구매와 중고거래 플랫폼 입니다. 이 API 문서는 SoongPal의 API 사용법을 설명합니다.");

        SecurityScheme jwtScheme = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .in(SecurityScheme.In.HEADER)
                .name("Authorization");

        SecurityRequirement securityRequirement = new SecurityRequirement()
                .addList("JWT");

        return new OpenAPI()
                .components(new Components().addSecuritySchemes("JWT", jwtScheme))
                .addSecurityItem(securityRequirement)
                .info(info)
                .addServersItem(new Server().url("http://localhost:8080").description("로컬 서버"))
                .addServersItem(new Server().url("https://api.soongpal.shop").description("IP 서버"));
    }

}
