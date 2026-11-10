package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.dto.CambiarRolRequest;
import com.museocafe.backendmuseo.dto.ResetearRuletaRequest;
import com.museocafe.backendmuseo.model.Pedido;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.PedidoRepository;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class AdminController {

    private final UsuarioRepository usuarioRepository;
    private final PedidoRepository pedidoRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminController(
            UsuarioRepository usuarioRepository,
            PedidoRepository pedidoRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.usuarioRepository = usuarioRepository;
        this.pedidoRepository = pedidoRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> cargarDashboard() {
        Map<String, Object> respuesta = new HashMap<>();

        respuesta.put("usuarios", usuarioRepository.findAll());

        List<Pedido> ventas = pedidoRepository.findAll().stream()
                .filter(p -> "recogido".equalsIgnoreCase(p.getEstado()) || "entregado".equalsIgnoreCase(p.getEstado()))
                .sorted(Comparator.comparing(
                        (Pedido p) -> p.getFechaPedido() != null ? p.getFechaPedido() : LocalDateTime.MIN
                ).reversed())
                .collect(Collectors.toList());

        respuesta.put("ventas", ventas);

        BigDecimal ingresosTotales = ventas.stream()
                .map(p -> p.getTotalPagado() != null ? p.getTotalPagado() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        respuesta.put("ingresos_totales", ingresosTotales);

        respuesta.put("success", true);
        return ResponseEntity.ok(respuesta);
    }

    private boolean verificarPasswordAdmin(Long idAdmin, String passwordPlano) {
        if (passwordPlano == null || passwordPlano.isBlank()) {
            return false;
        }
        if (idAdmin != null) {
            Optional<Usuario> adminOpt = usuarioRepository.findById(idAdmin);
            if (adminOpt.isPresent() && "admin".equalsIgnoreCase(adminOpt.get().getRol())) {
                return passwordEncoder.matches(passwordPlano, adminOpt.get().getPassword());
            }
        }
        return usuarioRepository.findAll().stream()
                .filter(u -> "admin".equalsIgnoreCase(u.getRol()))
                .anyMatch(u -> passwordEncoder.matches(passwordPlano, u.getPassword()));
    }

    @PostMapping("/cambiar-rol")
    public ResponseEntity<?> cambiarRol(@RequestBody CambiarRolRequest request) {
        if (request.getAdminPassword() != null && !request.getAdminPassword().isBlank()) {
            if (!verificarPasswordAdmin(request.getIdAdmin(), request.getAdminPassword())) {
                return ResponseEntity.status(403).body(Map.of("success", false, "mensaje", "Contraseña de administrador incorrecta."));
            }
        }

        if (request.getIdAdmin() != null && request.getIdAdmin().equals(request.getIdUsuarioObjetivo())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Por seguridad no puedes cambiar tu propio rol."));
        }

        Optional<Usuario> usuarioOpt = usuarioRepository.findById(request.getIdUsuarioObjetivo());
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Usuario no encontrado."));
        }

        Usuario usuario = usuarioOpt.get();
        usuario.setRol(request.getNuevoRol());
        usuarioRepository.save(usuario);

        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Rol actualizado correctamente a '" + request.getNuevoRol() + "'."));
    }

    @PostMapping("/resetear-ruleta")
    public ResponseEntity<?> resetearRuleta(@RequestBody ResetearRuletaRequest request) {
        if (request.getAdminPassword() != null && !request.getAdminPassword().isBlank()) {
            if (!verificarPasswordAdmin(request.getIdAdmin(), request.getAdminPassword())) {
                return ResponseEntity.status(403).body(Map.of("success", false, "mensaje", "Contraseña de administrador incorrecta."));
            }
        }

        Optional<Usuario> usuarioOpt = usuarioRepository.findById(request.getIdUsuarioObjetivo());
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Usuario no encontrado."));
        }

        Usuario usuario = usuarioOpt.get();
        usuario.setFechaUltimoGiro(null);
        usuario.setGirosExtra((usuario.getGirosExtra() != null ? usuario.getGirosExtra() : 0) + 1);
        usuarioRepository.save(usuario);

        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Ruleta reseteada (+1 giro extra otorgado). El usuario puede girar hoy."));
    }
}
