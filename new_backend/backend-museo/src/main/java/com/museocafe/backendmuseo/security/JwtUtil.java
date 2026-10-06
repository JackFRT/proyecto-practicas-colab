package com.museocafe.backendmuseo.security;

import com.museocafe.backendmuseo.model.Usuario;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtil {

    // Llave secreta para firmar los tokens (En producción, mover al application.properties)
    private final Key SECRET_KEY = Keys.secretKeyFor(SignatureAlgorithm.HS256);
    // El token expira en 24 horas
    private final long EXPIRATION_TIME = 86400000; 

    public String generateToken(Usuario usuario) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("rol", usuario.getRol());
        claims.put("idUsuario", usuario.getIdUsuario());

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(usuario.getEmail()) // El identificador principal
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(SECRET_KEY)
                .compact();
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parserBuilder().setSigningKey(SECRET_KEY).build().parseClaimsJws(token).getBody();
    }
}