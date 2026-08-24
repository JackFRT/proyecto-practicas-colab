package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Cupon;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.CuponRepository;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

@RestController
@RequestMapping("/api/ruleta")
@CrossOrigin(origins = "*")
public class RuletaController {

    private final UsuarioRepository usuarioRepository;
    private final CuponRepository cuponRepository;

    public RuletaController(UsuarioRepository usuarioRepository, CuponRepository cuponRepository) {
        this.usuarioRepository = usuarioRepository;
        this.cuponRepository = cuponRepository;
    }

    @PostMapping("/girar/{idUsuario}")
    public ResponseEntity<?> girarRuleta(@PathVariable Long idUsuario) {
        Usuario usuario = usuarioRepository.findById(idUsuario).orElse(null);
        if (usuario == null) {
            return ResponseEntity.badRequest().body("Usuario no encontrado");
        }

        if (usuario.getGirosExtra() <= 0) {
            return ResponseEntity.badRequest().body("No tienes giros disponibles. ¡Registra una visita presencial para obtener más!");
        }

        // Descontar giro
        usuario.setGirosExtra(usuario.getGirosExtra() - 1);
        usuario.setFechaUltimoGiro(LocalDateTime.now());
        usuarioRepository.save(usuario);

        // Lógica de sorteo de premios
        int[] premiosPorcentaje = {10, 15, 20, 25, 50}; // Porcentajes de descuento
        int descuentoGanado = premiosPorcentaje[new Random().nextInt(premiosPorcentaje.length)];

        // Generar cupón en BD
        Cupon cupon = new Cupon();
        cupon.setCodigo("CACTUS-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase());
        cupon.setDescuentoPorcentaje(descuentoGanado);
        cupon.setUsuario(usuario);
        cupon.setFechaVencimiento(LocalDateTime.now().plusDays(7));
        cuponRepository.save(cupon);

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("mensaje", "¡Felicidades! Ganaste un descuento del " + descuentoGanado + "%");
        respuesta.put("codigoCupon", cupon.getCodigo());
        respuesta.put("descuento", descuentoGanado);
        respuesta.put("girosRestantes", usuario.getGirosExtra());

        return ResponseEntity.ok(respuesta);
    }
}