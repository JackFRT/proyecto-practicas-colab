package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.dto.CambiarRolRequest;
import com.museocafe.backendmuseo.dto.ResetearRuletaRequest;
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
/* =========================================================================================
   [PRODUCCIÓN - DOMINIO] 
   ========================================================================================= */
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class AdminController {

    private final UsuarioRepository usuarioRepository;
    private final PedidoRepository pedidoRepository;

    public AdminController(UsuarioRepository usuarioRepository, PedidoRepository pedidoRepository) {
        this.usuarioRepository = usuarioRepository;
        this.pedidoRepository = pedidoRepository;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> cargarDashboard() {
        Map<String, Object> respuesta = new HashMap<>();

        respuesta.put("usuarios", usuarioRepository.findAll());

        List<Pedido> ventas = pedidoRepository.findByEstado("entregado");
        respuesta.put("ventas", ventas);

        BigDecimal ingresosTotales = ventas.stream()
                .map(Pedido::getTotalPagado)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        respuesta.put("ingresos_totales", ingresosTotales);

        respuesta.put("success", true);
        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/cambiar-rol")
    public ResponseEntity<?> cambiarRol(@RequestBody CambiarRolRequest request) { // <--- Usando DTO
        
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(request.getIdUsuarioObjetivo());
        
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Usuario no encontrado."));
        }

        Usuario usuario = usuarioOpt.get();
        usuario.setRol(request.getNuevoRol());
        usuarioRepository.save(usuario);

        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Rol actualizado correctamente."));
    }

    @PostMapping("/resetear-ruleta")
    public ResponseEntity<?> resetearRuleta(@RequestBody ResetearRuletaRequest request) { // <--- Usando DTO
        
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(request.getIdUsuarioObjetivo());
        
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Usuario no encontrado."));
        }

        Usuario usuario = usuarioOpt.get();
        usuario.setFechaUltimoGiro(null); 
        usuarioRepository.save(usuario);

        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Ruleta reseteada. El usuario puede girar hoy."));
    }
}