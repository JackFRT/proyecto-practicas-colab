package com.museocafe.backendmuseo.security;

import io.jsonwebtoken.Claims;
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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class JwtRequestFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    private static class VentanaIp {
        long inicioVentanaMs = System.currentTimeMillis();
        AtomicInteger contador = new AtomicInteger(0);
    }

    private final Map<String, VentanaIp> rateLimitPorIp = new ConcurrentHashMap<>();
    private static final int LIMITE_PETICIONES_SENSIBLES_POR_MINUTO = 35;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        // 1. Cabeceras de Seguridad HTTP para proteger el despliegue contra XSS, Clickjacking y MIME Sniffing
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "SAMEORIGIN");
        response.setHeader("X-XSS-Protection", "1; mode=block");
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        response.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

        // 2. Rate Limiting Anti-Bots en rutas críticas de escritura/autenticación
        String path = request.getRequestURI();
        if ("POST".equalsIgnoreCase(request.getMethod()) && (path.startsWith("/api/auth/") || path.startsWith("/api/pedidos/crear"))) {
            String ip = obtenerIpCliente(request);
            if (excedeLimitePeticiones(ip)) {
                response.setStatus(429);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"success\":false,\"mensaje\":\"Demasiadas solicitudes seguidas detectadas. Por seguridad anti-bots, espera un minuto antes de reintentar.\"}");
                return;
            }
        }

        final String authorizationHeader = request.getHeader("Authorization");

        String email = null;
        String jwt = null;
        String rol = null;

        // 3. Verificamos si la petición trae el Token en la cabecera
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7);
            try {
                Claims claims = jwtUtil.extractAllClaims(jwt);
                email = claims.getSubject();
                rol = claims.get("rol", String.class);
            } catch (Exception e) {
                System.out.println("Token inválido o expirado: " + e.getMessage());
            }
        }

        // 4. Si el token es válido y el usuario aún no está autenticado en este hilo
        if (email != null && rol != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            SimpleGrantedAuthority authority = new SimpleGrantedAuthority(rol);
            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                    email, null, Collections.singletonList(authority));
            SecurityContextHolder.getContext().setAuthentication(authToken);
        }

        chain.doFilter(request, response);
    }

    private String obtenerIpCliente(HttpServletRequest req) {
        String forwarded = req.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return req.getRemoteAddr() != null ? req.getRemoteAddr() : "unknown";
    }

    private boolean excedeLimitePeticiones(String ip) {
        long ahora = System.currentTimeMillis();
        VentanaIp ventana = rateLimitPorIp.computeIfAbsent(ip, k -> new VentanaIp());
        synchronized (ventana) {
            if (ahora - ventana.inicioVentanaMs > 60_000L) {
                ventana.inicioVentanaMs = ahora;
                ventana.contador.set(1);
                return false;
            }
            return ventana.contador.incrementAndGet() > LIMITE_PETICIONES_SENSIBLES_POR_MINUTO;
        }
    }
}
