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
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class AuthController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // Protección Anti-Fuerza Bruta en memoria
    private static class IntentoLogin {
        int fallos = 0;
        LocalDateTime bloqueadoHasta = null;
    }

    private final Map<String, IntentoLogin> intentosPorCorreo = new ConcurrentHashMap<>();
    private static final int MAX_INTENTOS_FALLIDOS = 5;

    public AuthController(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    private String sanitizarTexto(String input) {
        if (input == null) return "";
        return input.replaceAll("[<>\"']", "").trim();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        // 1. Verificación Honeypot Anti-Bots
        if (loginRequest.getWebsiteHp() != null && !loginRequest.getWebsiteHp().trim().isEmpty()) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "mensaje", "Solicitud bloqueada por el escudo anti-bots."
            ));
        }

        String email = loginRequest.getEmail() != null ? loginRequest.getEmail().trim().toLowerCase() : "";
        String password = loginRequest.getPassword() != null ? loginRequest.getPassword() : "";

        if (email.isEmpty() || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Ingresa tu correo y contraseña."));
        }

        // 2. Verificación Anti-Fuerza Bruta por cuenta
        IntentoLogin registroIntento = intentosPorCorreo.computeIfAbsent(email, k -> new IntentoLogin());
        if (registroIntento.bloqueadoHasta != null && registroIntento.bloqueadoHasta.isAfter(LocalDateTime.now())) {
            return ResponseEntity.status(429).body(Map.of(
                    "success", false,
                    "mensaje", "Demasiados intentos fallidos. Por seguridad, espera 3 minutos antes de volver a intentarlo."
            ));
        }

        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(loginRequest.getEmail().trim());
        if (usuarioOpt.isEmpty()) {
            usuarioOpt = usuarioRepository.findByEmail(email);
        }

        if (usuarioOpt.isPresent() && passwordEncoder.matches(password, usuarioOpt.get().getPassword())) {
            Usuario usuario = usuarioOpt.get();

            // Limpiar contador de fallos al iniciar sesión con éxito
            intentosPorCorreo.remove(email);

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

        // Registrar fallo para protección anti-fuerza bruta
        registroIntento.fallos++;
        if (registroIntento.fallos >= MAX_INTENTOS_FALLIDOS) {
            registroIntento.bloqueadoHasta = LocalDateTime.now().plusMinutes(3);
            registroIntento.fallos = 0;
            return ResponseEntity.status(429).body(Map.of(
                    "success", false,
                    "mensaje", "Se detectaron 5 intentos fallidos seguidos. Cuenta protegida temporalmente por 3 minutos."
            ));
        }

        return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Correo o contraseña incorrectos."));
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registro(@RequestBody Map<String, String> payload) {
        try {
            // 1. Verificación Honeypot Anti-Bots
            String honeypot = payload.get("websiteHp");
            if (honeypot != null && !honeypot.trim().isEmpty()) {
                return ResponseEntity.status(403).body(Map.of("success", false, "mensaje", "Registro bloqueado por protección anti-bots."));
            }

            String email = sanitizarTexto(payload.get("email"));
            if (email.isEmpty() || !email.contains("@")) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Ingresa un correo electrónico válido."));
            }

            if (usuarioRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "El correo ya está registrado."));
            }

            String passwordPlano = payload.get("password");
            if (passwordPlano == null || passwordPlano.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "La contraseña es obligatoria."));
            }

            String nombreLimpio = sanitizarTexto(payload.get("nombre"));
            if (nombreLimpio.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "El nombre es obligatorio."));
            }

            Usuario nuevoUsuario = new Usuario();
            nuevoUsuario.setNombre(nombreLimpio);
            nuevoUsuario.setEmail(email);
            nuevoUsuario.setPassword(passwordEncoder.encode(passwordPlano));
            nuevoUsuario.setDni(sanitizarTexto(payload.get("dni")));
            nuevoUsuario.setTelefono(sanitizarTexto(payload.get("telefono")));
            nuevoUsuario.setRol("cliente");

            usuarioRepository.save(nuevoUsuario);
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Cuenta creada exitosamente."));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error interno al registrar: " + e.getMessage()));
        }
    }

    @PostMapping("/recuperar/solicitar")
    public ResponseEntity<?> solicitarCodigo(@RequestBody Map<String, String> payload) {
        String email = sanitizarTexto(payload.get("email"));
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
        String email = sanitizarTexto(payload.get("email"));
        String codigo = sanitizarTexto(payload.get("codigo"));
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
