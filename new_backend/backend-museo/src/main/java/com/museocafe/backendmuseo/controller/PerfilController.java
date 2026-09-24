package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.CuponRepository;
import com.museocafe.backendmuseo.repository.PedidoRepository;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/perfil")
@CrossOrigin(origins = "*")
public class PerfilController {

    private final UsuarioRepository usuarioRepository;
    private final PedidoRepository pedidoRepository;
    private final CuponRepository cuponRepository;

    public PerfilController(UsuarioRepository usuarioRepository, PedidoRepository pedidoRepository, CuponRepository cuponRepository) {
        this.usuarioRepository = usuarioRepository;
        this.pedidoRepository = pedidoRepository;
        this.cuponRepository = cuponRepository;
    }

    @GetMapping("/cargar/{idUsuario}")
    public ResponseEntity<?> cargarPerfil(@PathVariable Long idUsuario) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(idUsuario);
        
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Usuario no encontrado"));
        }

        Usuario usuario = usuarioOpt.get();
        int visitas = usuario.getVisitasPresenciales() != null ? usuario.getVisitasPresenciales() : 0;

        // SISTEMA DE NIVELES (Traducido de perfil_api.php)
        Map<String, Object> nivel = new HashMap<>();
        if (visitas >= 51) {
            nivel.put("nivel", 5); nivel.put("next", "MAX"); nivel.put("texto", "Nivel Máximo"); nivel.put("progreso", 100);
            nivel.put("beneficios", "¡Eres una leyenda! 15% de descuento permanente. Al acumular 4 compras puedes elegir premios premium.");
        } else if (visitas >= 31) {
            nivel.put("nivel", 4); nivel.put("next", 51); nivel.put("texto", "Nivel 5"); nivel.put("progreso", ((visitas - 31.0) / 20.0) * 100);
            nivel.put("beneficios", "¡Socio Experto! 10% de descuento permanente.");
        } else if (visitas >= 16) {
            nivel.put("nivel", 3); nivel.put("next", 31); nivel.put("texto", "Nivel 4"); nivel.put("progreso", ((visitas - 16.0) / 15.0) * 100);
            nivel.put("beneficios", "¡Socio Frecuente! 7% de descuento permanente.");
        } else if (visitas >= 8) {
            nivel.put("nivel", 2); nivel.put("next", 16); nivel.put("texto", "Nivel 3"); nivel.put("progreso", ((visitas - 8.0) / 8.0) * 100);
            nivel.put("beneficios", "¡Socio Aficionado! Al acumular 4 compras elige entre: Cupón, Libro PDF o Llavero.");
        } else if (visitas >= 3) {
            nivel.put("nivel", 1); nivel.put("next", 8); nivel.put("texto", "Nivel 2"); nivel.put("progreso", ((visitas - 3.0) / 5.0) * 100);
            nivel.put("beneficios", "¡Socio Oficial! Acumula 4 compras para un cupón del 25%.");
        } else {
            nivel.put("nivel", 0); nivel.put("next", 3); nivel.put("texto", "Nivel 1"); nivel.put("progreso", (visitas / 3.0) * 100);
            nivel.put("beneficios", "Visita la cafetería para empezar a subir de nivel y desbloquear descuentos.");
        }

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("success", true);
        respuesta.put("usuario", usuario);
        respuesta.put("datos_nivel", nivel);
        
        // Historial de compras y Cupones disponibles
        respuesta.put("historial", pedidoRepository.findByUsuarioIdUsuarioOrderByFechaPedidoDesc(idUsuario));
        respuesta.put("cupones", cuponRepository.findByUsuarioIdUsuario(idUsuario));

        return ResponseEntity.ok(respuesta);
    }
}