package com.museocafe.backendmuseo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Obtenemos la ruta absoluta asegurándonos de que termine en barra (/)
        String rutaAbsoluta = Paths.get("uploads").toAbsolutePath().toUri().toString();
        if (!rutaAbsoluta.endsWith("/")) {
            rutaAbsoluta += "/";
        }
        
        registry.addResourceHandler("/api/archivos/**")
                .addResourceLocations(rutaAbsoluta);
    }
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/archivos/**").allowedOrigins("*");
    }
}