package com.museocafe.backendmuseo.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtRequestFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        final String authorizationHeader = request.getHeader("Authorization");

        String email = null;
        String jwt = null;
        String rol = null;

        // 1. Verificamos si la petición trae el Token en la cabecera
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7);
            try {
                // Extraemos los datos del token usando la llave secreta
                Claims claims = jwtUtil.extractAllClaims(jwt);
                email = claims.getSubject();
                rol = claims.get("rol", String.class);
            } catch (Exception e) {
                System.out.println("Token inválido o expirado: " + e.getMessage());
            }
        }

        // 2. Si el token es válido y el usuario aún no está autenticado en este hilo
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            
            // Le decimos a Spring Security qué rol tiene este usuario
            SimpleGrantedAuthority authority = new SimpleGrantedAuthority(rol);
            
            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                    email, null, Collections.singletonList(authority));

            // Guardamos la sesión en el contexto de seguridad
            SecurityContextHolder.getContext().setAuthentication(authToken);
        }

        // 3. Continuamos con el flujo normal de la petición hacia el Controlador
        chain.doFilter(request, response);
    }
}