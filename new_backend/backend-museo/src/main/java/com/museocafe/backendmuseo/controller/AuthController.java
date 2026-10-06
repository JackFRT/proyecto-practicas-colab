package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.dto.LoginRequest;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import com.museocafe.backendmuseo.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/auth")
/* =========================================================================================
   [PRODUCCIÓN - DOMINIO] 
   Cuando tengas tu dominio, cambia los orígenes para que solo tu web pueda consultar esta API.
   Ejemplo: @CrossOrigin(origins = {"http://localhost:4200", "https://www.cafeayacuchano.com"})
   ========================================================================================= */
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class AuthController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) { // <--- AQUÍ USAMOS TU DTO
        
        // Ahora extraemos los datos usando los getters que generó Lombok
        String email = loginRequest.getEmail();
        String password = loginRequest.getPassword();

        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(email);
        
        // PRODUCCIÓN: Verificamos el hash con BCrypt
        if (usuarioOpt.isPresent() && passwordEncoder.matches(password, usuarioOpt.get().getPassword())) {
            Usuario usuario = usuarioOpt.get();
            
            // Generamos el Token JWT para la sesión
            String token = jwtUtil.generateToken(usuario);

            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("success", true);
            respuesta.put("token", token); 
            respuesta.put("usuario", usuario); 
            return ResponseEntity.ok(respuesta);
        }
        
        return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Correo o contraseña incorrectos."));
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registro(@RequestBody Usuario nuevoUsuario) {
        if (usuarioRepository.findByEmail(nuevoUsuario.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "El correo ya está registrado."));
        }
        
        nuevoUsuario.setPassword(passwordEncoder.encode(nuevoUsuario.getPassword()));
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
        usuario.setExpiracionCodigo(LocalDateTime.now().plusMinutes(15)); 
        
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
            
            if (usuario.getCodigoRecuperacion() == null || !usuario.getCodigoRecuperacion().equals(codigo)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Código inválido."));
            }
            
            if (usuario.getExpiracionCodigo() != null && LocalDateTime.now().isAfter(usuario.getExpiracionCodigo())) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "El código ha expirado. Solicita uno nuevo."));
            }
            
            usuario.setPassword(passwordEncoder.encode(nuevaPassword));
            usuario.setCodigoRecuperacion(null);
            usuario.setExpiracionCodigo(null);
            
            usuarioRepository.save(usuario);
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Contraseña actualizada con éxito."));
        }
        
        return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Correo incorrecto."));
    }
}