package com.museocafe.backendmuseo.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtRequestFilter jwtRequestFilter;

    // 1. Motor de encriptación de contraseñas
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // 2. Reglas de acceso a las rutas (Endpoints)
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // Desactivado para APIs REST
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Rutas Públicas
                .requestMatchers("/api/auth/**", "/api/publico/**", "/images/**").permitAll()
                
                // === AQUÍ ESTÁ EL CAMBIO ===
                // Ahora tanto Empleados como Admins tienen acceso al inventario y dashboard
                .requestMatchers("/api/admin/**").hasAuthority("admin")
                .requestMatchers("/api/empleado/**", "/api/inventario/**").hasAnyAuthority("empleado", "admin")
                
                // Marketing
                .requestMatchers("/api/marketing/cupones/**").hasAuthority("admin")
                .requestMatchers("/api/marketing/noticias/**").hasAnyAuthority("empleado", "admin")
                
                // Cualquier otra ruta (como Perfil o hacer Pedidos) requiere estar logueado
                .anyRequest().authenticated()
            );

        // Añadimos nuestro filtro JWT antes del filtro estándar de Spring
        http.addFilterBefore(jwtRequestFilter, org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }

    // 3. Configuración estricta de CORS para Producción
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:4200")); // Añadir tu dominio aquí
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}