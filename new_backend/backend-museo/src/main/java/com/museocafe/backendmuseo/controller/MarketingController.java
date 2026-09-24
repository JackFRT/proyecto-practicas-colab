package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Cupon;
import com.museocafe.backendmuseo.model.Noticia;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.CuponRepository;
import com.museocafe.backendmuseo.repository.NoticiaRepository;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/marketing")
@CrossOrigin(origins = "*")
public class MarketingController {

    private final CuponRepository cuponRepository;
    private final NoticiaRepository noticiaRepository;
    private final UsuarioRepository usuarioRepository; // Añadido para verificar quién hace la petición

    public MarketingController(CuponRepository cuponRepository, NoticiaRepository noticiaRepository, UsuarioRepository usuarioRepository) {
        this.cuponRepository = cuponRepository;
        this.noticiaRepository = noticiaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    // ==========================================
    // 1. GESTIÓN DE CUPONES (ESTRICTAMENTE SOLO ADMIN)
    // ==========================================
    @PostMapping("/cupones/guardar/{idUsuario}")
    public ResponseEntity<?> guardarCupon(@PathVariable Long idUsuario, @RequestBody Map<String, Object> payload) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(idUsuario);
        
        // Bloqueo de seguridad: Si no existe o no es admin, lo rechazamos
        if (usuarioOpt.isEmpty() || !"admin".equals(usuarioOpt.get().getRol())) {
            return ResponseEntity.status(403).body(Map.of("success", false, "mensaje", "Acceso denegado: Solo los administradores pueden crear cupones."));
        }

        Cupon cupon = new Cupon();
        cupon.setCodigo(payload.get("codigo_cupon").toString().toUpperCase()); 
        cupon.setDescuentoPorcentaje(Integer.valueOf(payload.get("descuento").toString()));
        cupon.setLimiteUsos(Integer.valueOf(payload.get("limite_usos").toString()));
        
        int diasValidez = Integer.parseInt(payload.getOrDefault("dias_validez", "30").toString());
        cupon.setFechaVencimiento(LocalDateTime.now().plusDays(diasValidez));
        
        cuponRepository.save(cupon);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Cupón creado exitosamente."));
    }

    @DeleteMapping("/cupones/eliminar/{idCupon}/usuario/{idUsuario}")
    public ResponseEntity<?> eliminarCupon(@PathVariable Long idCupon, @PathVariable Long idUsuario) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(idUsuario);
        if (usuarioOpt.isEmpty() || !"admin".equals(usuarioOpt.get().getRol())) {
            return ResponseEntity.status(403).body(Map.of("success", false, "mensaje", "Acceso denegado."));
        }

        cuponRepository.deleteById(idCupon);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Cupón eliminado."));
    }

    // ==========================================
    // 2. GESTIÓN DE NOTICIAS (ADMIN Y EMPLEADOS)
    // ==========================================
    @PostMapping("/noticias/guardar/{idUsuario}")
    public ResponseEntity<?> guardarNoticia(@PathVariable Long idUsuario, @RequestBody Noticia noticia) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(idUsuario);
        
        // Bloqueo de seguridad: Validamos que sea admin O empleado
        if (usuarioOpt.isEmpty() || (!"admin".equals(usuarioOpt.get().getRol()) && !"empleado".equals(usuarioOpt.get().getRol()))) {
            return ResponseEntity.status(403).body(Map.of("success", false, "mensaje", "Acceso denegado: Se requiere rol de administrador o empleado."));
        }

        noticiaRepository.save(noticia);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Noticia publicada correctamente en el boletín."));
    }

    @DeleteMapping("/noticias/eliminar/{idNoticia}/usuario/{idUsuario}")
    public ResponseEntity<?> eliminarNoticia(@PathVariable Long idNoticia, @PathVariable Long idUsuario) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(idUsuario);
        if (usuarioOpt.isEmpty() || (!"admin".equals(usuarioOpt.get().getRol()) && !"empleado".equals(usuarioOpt.get().getRol()))) {
            return ResponseEntity.status(403).body(Map.of("success", false, "mensaje", "Acceso denegado."));
        }

        noticiaRepository.deleteById(idNoticia);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Noticia eliminada."));
    }

    @PostMapping("/noticias/toggle/{idNoticia}/usuario/{idUsuario}")
    public ResponseEntity<?> toggleNoticia(@PathVariable Long idNoticia, @PathVariable Long idUsuario) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(idUsuario);
        if (usuarioOpt.isEmpty() || (!"admin".equals(usuarioOpt.get().getRol()) && !"empleado".equals(usuarioOpt.get().getRol()))) {
            return ResponseEntity.status(403).body(Map.of("success", false, "mensaje", "Acceso denegado."));
        }

        Optional<Noticia> noticiaOpt = noticiaRepository.findById(idNoticia);
        if (noticiaOpt.isEmpty()) return ResponseEntity.badRequest().build();
        
        Noticia noticia = noticiaOpt.get();
        noticia.setEstado(!noticia.getEstado()); 
        noticiaRepository.save(noticia);
        
        String mensaje = noticia.getEstado() ? "Noticia ahora es pública." : "Noticia ocultada del catálogo.";
        return ResponseEntity.ok(Map.of("success", true, "mensaje", mensaje));
    }
}