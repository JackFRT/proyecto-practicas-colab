package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UsuarioRepository usuarioRepository;

    public AuthController(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");

        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(email);
        
        
        if (usuarioOpt.isPresent() && usuarioOpt.get().getPassword().equals(password)) {
            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("success", true);
            respuesta.put("usuario", usuarioOpt.get());
            return ResponseEntity.ok(respuesta);
        }
        
        return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Correo o contraseña incorrectos."));
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registro(@RequestBody Usuario nuevoUsuario) {
        if (usuarioRepository.findByEmail(nuevoUsuario.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "El correo ya está registrado."));
        }
        
        nuevoUsuario.setRol("cliente");
        usuarioRepository.save(nuevoUsuario);
        
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Cuenta creada exitosamente."));
    }

    @PostMapping("/recuperar/solicitar")
    public ResponseEntity<?> solicitarCodigo(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(email);
        
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "El correo no existe."));
        }
        
        Usuario usuario = usuarioOpt.get();
        String codigo = String.format("%06d", new Random().nextInt(999999));
        usuario.setCodigoRecuperacion(codigo);
        usuarioRepository.save(usuario);
        
        System.out.println("=========================================");
        System.out.println("CÓDIGO DE RECUPERACIÓN PARA " + email + ": " + codigo);
        System.out.println("=========================================");
        
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Código enviado a tu correo."));
    }

    @PostMapping("/recuperar/cambiar")
    public ResponseEntity<?> cambiarPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String codigo = payload.get("codigo");
        String nuevaPassword = payload.get("nueva_password");
        
        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(email);
        
        if (usuarioOpt.isPresent()) {
            Usuario usuario = usuarioOpt.get();
            if (codigo != null && codigo.equals(usuario.getCodigoRecuperacion())) {
                usuario.setPassword(nuevaPassword);
                usuario.setCodigoRecuperacion(null);
                usuarioRepository.save(usuario);
                return ResponseEntity.ok(Map.of("success", true, "mensaje", "Contraseña actualizada con éxito."));
            }
        }
        return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Código inválido o correo incorrecto."));
    }
}