package com.museocafe.backendmuseo.config; 

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Todo lo que Angular pida con "/images/..." se buscará en tu carpeta local "uploads/images/"
        registry.addResourceHandler("/images/**")
                .addResourceLocations("file:uploads/images/");
    }
}