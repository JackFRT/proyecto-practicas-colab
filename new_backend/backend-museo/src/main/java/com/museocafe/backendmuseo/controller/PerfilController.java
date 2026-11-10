package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Cupon;
import com.museocafe.backendmuseo.model.Pedido;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.CuponRepository;
import com.museocafe.backendmuseo.repository.PedidoRepository;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/perfil")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class PerfilController {

    private final UsuarioRepository usuarioRepository;
    private final PedidoRepository pedidoRepository;
    private final CuponRepository cuponRepository;
    private final PasswordEncoder passwordEncoder;

    public PerfilController(
            UsuarioRepository usuarioRepository,
            PedidoRepository pedidoRepository,
            CuponRepository cuponRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.usuarioRepository = usuarioRepository;
        this.pedidoRepository = pedidoRepository;
        this.cuponRepository = cuponRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/cargar/{idUsuario}")
    public ResponseEntity<?> cargarPerfil(@PathVariable Long idUsuario) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(idUsuario);

        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Usuario no encontrado"));
        }

        Usuario usuario = usuarioOpt.get();
        int visitas = usuario.getVisitasPresenciales() != null ? usuario.getVisitasPresenciales() : 0;
        int comprados = usuario.getProductosComprados() != null ? usuario.getProductosComprados() : 0;
        int plantasCiclo = comprados % 4;
        double progresoPlantas = (plantasCiclo / 4.0) * 100.0;

        Map<String, Object> nivel = new HashMap<>();
        if (visitas >= 51) {
            nivel.put("nivel", 5);
            nivel.put("next", "MAX");
            nivel.put("texto", "Nivel Máximo");
            nivel.put("progreso", 100);
            nivel.put("beneficios", "¡Eres una leyenda! 15% de descuento permanente. Al acumular 4 compras puedes elegir premios premium.");
        } else if (visitas >= 31) {
            nivel.put("nivel", 4);
            nivel.put("next", 51);
            nivel.put("texto", "Nivel 5");
            nivel.put("progreso", ((visitas - 31.0) / 20.0) * 100);
            nivel.put("beneficios", "¡Socio Experto! 10% de descuento permanente.");
        } else if (visitas >= 16) {
            nivel.put("nivel", 3);
            nivel.put("next", 31);
            nivel.put("texto", "Nivel 4");
            nivel.put("progreso", ((visitas - 16.0) / 15.0) * 100);
            nivel.put("beneficios", "¡Socio Frecuente! 7% de descuento permanente.");
        } else if (visitas >= 8) {
            nivel.put("nivel", 2);
            nivel.put("next", 16);
            nivel.put("texto", "Nivel 3");
            nivel.put("progreso", ((visitas - 8.0) / 8.0) * 100);
            nivel.put("beneficios", "¡Socio Aficionado! Al acumular 4 compras elige entre: Cupón, Libro PDF o Llavero.");
        } else if (visitas >= 3) {
            nivel.put("nivel", 1);
            nivel.put("next", 8);
            nivel.put("texto", "Nivel 2");
            nivel.put("progreso", ((visitas - 3.0) / 5.0) * 100);
            nivel.put("beneficios", "¡Socio Oficial! Acumula 4 compras para un cupón del 25%.");
        } else {
            nivel.put("nivel", 0);
            nivel.put("next", 3);
            nivel.put("texto", "Nivel 1");
            nivel.put("progreso", (visitas / 3.0) * 100);
            nivel.put("beneficios", "Visita la cafetería para empezar a subir de nivel y desbloquear descuentos.");
        }
        nivel.put("plantas_acumuladas", plantasCiclo);
        nivel.put("progreso_plantas", progresoPlantas);

        LocalDateTime ahora = LocalDateTime.now();
        List<Cupon> cuponesDisponibles = cuponRepository.findAll().stream()
                .filter(c -> c.getUsuario() != null && c.getUsuario().getIdUsuario().equals(idUsuario))
                .filter(c -> (c.getUsosActuales() == null ? 0 : c.getUsosActuales()) < (c.getLimiteUsos() == null ? 1 : c.getLimiteUsos()))
                .filter(c -> c.getFechaVencimiento() == null || c.getFechaVencimiento().isAfter(ahora))
                .collect(Collectors.toList());

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("success", true);
        respuesta.put("usuario", usuario);
        respuesta.put("datos_nivel", nivel);
        respuesta.put("historial", pedidoRepository.findByUsuarioIdUsuarioOrderByFechaPedidoDesc(idUsuario));
        respuesta.put("cupones", cuponesDisponibles);

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/actualizar")
    public ResponseEntity<?> actualizarPerfil(@RequestBody Map<String, Object> payload) {
        try {
            Object idObj = payload.get("id_usuario") != null ? payload.get("id_usuario") : payload.get("idUsuario");
            if (idObj == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "ID de usuario obligatorio."));
            }
            Long idUsuario = Long.valueOf(idObj.toString());
            Optional<Usuario> opt = usuarioRepository.findById(idUsuario);
            if (opt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Usuario no encontrado."));
            }

            Usuario usuario = opt.get();
            if (payload.get("nombre") != null && !payload.get("nombre").toString().trim().isEmpty()) {
                usuario.setNombre(payload.get("nombre").toString().trim());
            }
            if (payload.get("dni") != null) {
                usuario.setDni(payload.get("dni").toString().trim());
            }
            if (payload.get("telefono") != null) {
                usuario.setTelefono(payload.get("telefono").toString().trim());
            }

            Object passObj = payload.get("nueva_password") != null ? payload.get("nueva_password") : payload.get("password");
            if (passObj != null && !passObj.toString().trim().isEmpty()) {
                usuario.setPassword(passwordEncoder.encode(passObj.toString().trim()));
            }

            usuarioRepository.save(usuario);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "mensaje", "Datos actualizados correctamente.",
                    "usuario", usuario
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al actualizar perfil: " + e.getMessage()));
        }
    }

    @DeleteMapping("/eliminar/{idUsuario}")
    @Transactional
    public ResponseEntity<?> eliminarCuentaDelete(@PathVariable Long idUsuario) {
        return ejecutarEliminacionCuenta(idUsuario);
    }

    @PostMapping("/eliminar/{idUsuario}")
    @Transactional
    public ResponseEntity<?> eliminarCuentaPost(@PathVariable Long idUsuario) {
        return ejecutarEliminacionCuenta(idUsuario);
    }

    private ResponseEntity<?> ejecutarEliminacionCuenta(Long idUsuario) {
        try {
            Optional<Usuario> opt = usuarioRepository.findById(idUsuario);
            if (opt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Usuario no encontrado."));
            }

            // Eliminar cupones personales del usuario
            List<Cupon> cuponesUsuario = cuponRepository.findByUsuarioIdUsuario(idUsuario);
            cuponRepository.deleteAll(cuponesUsuario);

            // Desvincular o eliminar pedidos del usuario para respetar claves foráneas
            List<Pedido> pedidosUsuario = pedidoRepository.findByUsuarioIdUsuarioOrderByFechaPedidoDesc(idUsuario);
            pedidoRepository.deleteAll(pedidosUsuario);

            usuarioRepository.deleteById(idUsuario);
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Tu cuenta ha sido eliminada permanentemente."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "No se pudo eliminar la cuenta: " + e.getMessage()));
        }
    }
}
