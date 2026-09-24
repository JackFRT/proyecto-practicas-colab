package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Pedido;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.PedidoRepository;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private final UsuarioRepository usuarioRepository;
    private final PedidoRepository pedidoRepository;

    public AdminController(UsuarioRepository usuarioRepository, PedidoRepository pedidoRepository) {
        this.usuarioRepository = usuarioRepository;
        this.pedidoRepository = pedidoRepository;
    }

    // 1. CARGAR DATOS DEL PANEL ADMIN (Reemplaza acción 'cargar' de admin_api.php)
    @GetMapping("/dashboard")
    public ResponseEntity<?> cargarDashboard() {
        Map<String, Object> respuesta = new HashMap<>();

        // Lista de todos los usuarios
        respuesta.put("usuarios", usuarioRepository.findAll());

        // Ventas completadas (antes 'recogido', ahora 'entregado' en nuestro nuevo flujo)
        List<Pedido> ventas = pedidoRepository.findByEstado("entregado");
        respuesta.put("ventas", ventas);

        // Calcular ingresos totales de forma automática
        BigDecimal ingresosTotales = ventas.stream()
                .map(Pedido::getTotalPagado)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        respuesta.put("ingresos_totales", ingresosTotales);

        respuesta.put("success", true);
        return ResponseEntity.ok(respuesta);
    }

    // 2. CAMBIAR ROL DE UN USUARIO (Reemplaza acción 'cambiar_rol')
    @PostMapping("/cambiar-rol")
    public ResponseEntity<?> cambiarRol(@RequestBody Map<String, Object> payload) {
        Long idUsuarioObjetivo = Long.valueOf(payload.get("id_usuario_objetivo").toString());
        String nuevoRol = payload.get("nuevo_rol").toString();

        Optional<Usuario> usuarioOpt = usuarioRepository.findById(idUsuarioObjetivo);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Usuario no encontrado."));
        }

        Usuario usuario = usuarioOpt.get();
        usuario.setRol(nuevoRol);
        usuarioRepository.save(usuario);

        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Rol actualizado correctamente."));
    }

    // 3. RESETEAR RULETA DE UN USUARIO (Reemplaza acción 'resetear_ruleta')
    @PostMapping("/resetear-ruleta")
    public ResponseEntity<?> resetearRuleta(@RequestBody Map<String, Object> payload) {
        Long idUsuarioObjetivo = Long.valueOf(payload.get("id_usuario_objetivo").toString());

        Optional<Usuario> usuarioOpt = usuarioRepository.findById(idUsuarioObjetivo);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Usuario no encontrado."));
        }

        Usuario usuario = usuarioOpt.get();
        // Borramos la fecha del último giro para que el cliente pueda volver a jugar
        usuario.setFechaUltimoGiro(null); 
        usuarioRepository.save(usuario);

        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Ruleta reseteada. El usuario puede girar hoy."));
    }
}