package com.museocafe.backendmuseo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private String toUriDir(String relativePath) {
        String uri = Paths.get(relativePath).toAbsolutePath().normalize().toUri().toString();
        return uri.endsWith("/") ? uri : uri + "/";
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadsLocal = toUriDir("uploads");
        String uploadsImagesLocal = toUriDir("uploads/images");
        String uploadsRoot = toUriDir("../../uploads");
        String uploadsImagesRoot = toUriDir("../../uploads/images");
        String staticImages = toUriDir("src/main/resources/static/images");
        String staticRoot = toUriDir("src/main/resources/static");

        registry.addResourceHandler("/api/archivos/**")
                .addResourceLocations(
                        uploadsLocal,
                        uploadsImagesLocal,
                        uploadsRoot,
                        uploadsImagesRoot,
                        staticRoot,
                        staticImages
                );

        registry.addResourceHandler("/images/**")
                .addResourceLocations(
                        uploadsImagesLocal,
                        uploadsImagesRoot,
                        uploadsLocal,
                        uploadsRoot,
                        staticImages,
                        "classpath:/static/images/"
                );
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/archivos/**").allowedOrigins("*");
        registry.addMapping("/images/**").allowedOrigins("*");
    }
}
