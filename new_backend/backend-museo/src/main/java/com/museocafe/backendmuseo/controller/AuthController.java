package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.dto.LoginRequest;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import com.museocafe.backendmuseo.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/auth")
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
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        String email = loginRequest.getEmail();
        String password = loginRequest.getPassword();

        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(email);

        if (usuarioOpt.isPresent() && passwordEncoder.matches(password, usuarioOpt.get().getPassword())) {
            Usuario usuario = usuarioOpt.get();

            // Verificar si el usuario tiene bloqueo temporal activo (ej. por comprobante falso)
            if (usuario.getBloqueadoHasta() != null && usuario.getBloqueadoHasta().isAfter(LocalDateTime.now())) {
                String fechaFin = usuario.getBloqueadoHasta().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "mensaje", "Tu cuenta se encuentra suspendida temporalmente hasta el " + fechaFin + " por incumplimiento en comprobantes de pago."
                ));
            }

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
    public ResponseEntity<?> registro(@RequestBody Map<String, String> payload) {
        try {
            String email = payload.get("email");
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "El correo es obligatorio."));
            }

            if (usuarioRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "El correo ya está registrado."));
            }

            String passwordPlano = payload.get("password");
            if (passwordPlano == null || passwordPlano.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "La contraseña es obligatoria."));
            }

            Usuario nuevoUsuario = new Usuario();
            nuevoUsuario.setNombre(payload.get("nombre"));
            nuevoUsuario.setEmail(email.trim());
            nuevoUsuario.setPassword(passwordEncoder.encode(passwordPlano));
            nuevoUsuario.setDni(payload.get("dni"));
            nuevoUsuario.setTelefono(payload.get("telefono"));
            nuevoUsuario.setRol("cliente");

            usuarioRepository.save(nuevoUsuario);
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Cuenta creada exitosamente."));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error interno al registrar: " + e.getMessage()));
        }
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

        return ResponseEntity.ok(Map.of(
                "success", true,
                "mensaje", "Código enviado a tu correo. (En entorno local revisa la consola o usa el código mostrado)."
        ));
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
