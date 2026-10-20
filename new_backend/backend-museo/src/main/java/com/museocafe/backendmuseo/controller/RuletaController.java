package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Cupon;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.CuponRepository;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import com.museocafe.backendmuseo.model.PremioRuleta;
import com.museocafe.backendmuseo.repository.PremioRuletaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

@RestController
@RequestMapping("/api/ruleta")
/* =========================================================================================
   [PRODUCCIÓN - DOMINIO] 
   Cuando tengas tu dominio, cambia los orígenes para que solo tu web pueda consultar esta API.
   Ejemplo: @CrossOrigin(origins = {"http://localhost:4200", "https://www.cafeayacuchano.com"})
   ========================================================================================= */
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class RuletaController {

    private final UsuarioRepository usuarioRepository;
    private final CuponRepository cuponRepository;
    private final PremioRuletaRepository premioRepository;

    public RuletaController(CuponRepository cuponRepository, UsuarioRepository usuarioRepository, PremioRuletaRepository premioRepository) {
        this.cuponRepository = cuponRepository;
        this.usuarioRepository = usuarioRepository;
        this.premioRepository = premioRepository;
    }

    

    @PostMapping("/girar/{idUsuario}")
    public ResponseEntity<?> girarRuleta(@PathVariable Long idUsuario) {
        /* 
         * =====================================================================================
         * SEGURIDAD AVANZADA (Para el futuro):
         * Extraer al usuario desde el Token JWT evita que alguien con herramientas de red 
         * modifique el ID en la URL e intente girar la ruleta y gastar los giros de otra persona.
         * =====================================================================================
         */
        
        Usuario usuario = usuarioRepository.findById(idUsuario).orElse(null);
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Usuario no encontrado"));
        }

        if (usuario.getGirosExtra() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "No tienes giros disponibles. ¡Registra una visita presencial para obtener más!"));
        }

        usuario.setGirosExtra(usuario.getGirosExtra() - 1);
        usuario.setFechaUltimoGiro(LocalDateTime.now());
        usuarioRepository.save(usuario);

        int[] premiosPorcentaje = {10, 15, 20, 25, 50}; 
        int descuentoGanado = premiosPorcentaje[new Random().nextInt(premiosPorcentaje.length)];

        Cupon cupon = new Cupon();
        cupon.setCodigo("CACTUS-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase());
        cupon.setDescuentoPorcentaje(descuentoGanado);
        cupon.setUsuario(usuario);
        cupon.setFechaVencimiento(LocalDateTime.now().plusDays(7));
        cuponRepository.save(cupon);

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("success", true);
        respuesta.put("mensaje", "¡Felicidades! Ganaste un descuento del " + descuentoGanado + "%");
        respuesta.put("codigoCupon", cupon.getCodigo());
        respuesta.put("descuento", descuentoGanado);
        respuesta.put("girosRestantes", usuario.getGirosExtra());

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/guardar/{idEmpleado}")
    public ResponseEntity<?> guardarPremio(@PathVariable Long idEmpleado, @RequestBody PremioRuleta premio) {
        try {
            // El repositorio que declaramos arriba ahora guarda el premio en PostgreSQL
            premioRepository.save(premio);
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Premio guardado exitosamente."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al guardar el premio: " + e.getMessage()));
        }
    }
}