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
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class RuletaController {

    private final PremioRuletaRepository premioRuletaRepository;

    public RuletaController(PremioRuletaRepository premioRuletaRepository) {
        this.premioRuletaRepository = premioRuletaRepository;
    }

    @PostMapping("/guardar")
    public ResponseEntity<?> guardarPremio(@RequestBody Map<String, Object> payload, 
                                          org.springframework.security.core.Authentication authentication) {
        try {
            PremioRuleta premio = new PremioRuleta();
            
            // Si viene un ID, es una actualización
            if (payload.get("id_premio") != null && !payload.get("id_premio").toString().isEmpty()) {
                premio.setIdPremio(Long.valueOf(payload.get("id_premio").toString()));
            }
            
            premio.setTitulo(payload.get("titulo").toString());
            premio.setDescuentoPorcentaje(Integer.valueOf(payload.get("descuento_porcentaje").toString()));
            premio.setColorSeccion(payload.get("color_seccion").toString());
            
            if (payload.get("probabilidad") != null) {
                premio.setProbabilidad(Double.valueOf(payload.get("probabilidad").toString()));
            }

            premioRuletaRepository.save(premio);
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Premio de la ruleta guardado con éxito."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al guardar premio: " + e.getMessage()));
        }
    }
}