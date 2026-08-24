package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.dto.LoginRequest;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UsuarioRepository usuarioRepository;

    public AuthController(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginDto) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(loginDto.getEmail());
        
        Map<String, Object> response = new HashMap<>();
        
        // Si el usuario existe y la contraseña es correcta
        if (usuarioOpt.isPresent() && usuarioOpt.get().getPassword().equals(loginDto.getPassword())) {
            response.put("success", true);
            response.put("usuario", usuarioOpt.get());
            return ResponseEntity.ok(response);
        }
        
        // Si falla, devolvemos success false para que tu frontend lo maneje
        response.put("success", false);
        response.put("mensaje", "Correo o contraseña incorrectos");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registrar(@RequestBody Usuario usuario) {
        Map<String, Object> response = new HashMap<>();
        if (usuarioRepository.existsByEmail(usuario.getEmail())) {
            response.put("success", false);
            response.put("mensaje", "El email ya está registrado");
            return ResponseEntity.ok(response);
        }
        
        if (usuario.getRol() == null || usuario.getRol().isEmpty()) {
            usuario.setRol("cliente");
        }
        
        response.put("success", true);
        response.put("usuario", usuarioRepository.save(usuario));
        return ResponseEntity.ok(response);
    }
}