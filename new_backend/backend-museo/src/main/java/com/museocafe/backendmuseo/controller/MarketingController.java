package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Cupon;
import com.museocafe.backendmuseo.model.Noticia;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.CuponRepository;
import com.museocafe.backendmuseo.repository.NoticiaRepository;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/marketing")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class MarketingController {

    private final CuponRepository cuponRepository;
    private final NoticiaRepository noticiaRepository;
    private final UsuarioRepository usuarioRepository;

    public MarketingController(CuponRepository cuponRepository, NoticiaRepository noticiaRepository, UsuarioRepository usuarioRepository) {
        this.cuponRepository = cuponRepository;
        this.noticiaRepository = noticiaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    private String guardarImagenNoticia(MultipartFile archivo) throws Exception {
        if (archivo == null || archivo.isEmpty()) return null;
        String original = archivo.getOriginalFilename() != null ? archivo.getOriginalFilename() : "news.jpg";
        String limpio = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        String nombreFinal = UUID.randomUUID().toString().substring(0, 8) + "_" + limpio;

        Path dir = Paths.get("uploads/images/news");
        Files.createDirectories(dir);
        Path destino = dir.resolve(nombreFinal);
        Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);

        try {
            if (Files.exists(Paths.get("../../uploads"))) {
                Path rootDir = Paths.get("../../uploads/images/news");
                Files.createDirectories(rootDir);
                Files.copy(destino, rootDir.resolve(nombreFinal), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (Exception ignored) {
        }
        return nombreFinal;
    }

    @PostMapping("/cupones/guardar")
    public ResponseEntity<?> guardarCupon(@RequestBody Map<String, Object> payload) {
        try {
            Cupon cupon = new Cupon();
            String codigo = payload.get("codigo") != null
                    ? payload.get("codigo").toString()
                    : (payload.get("codigo_cupon") != null ? payload.get("codigo_cupon").toString() : "");
            if (codigo.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "El código del cupón es obligatorio."));
            }
            cupon.setCodigo(codigo.trim().toUpperCase());

            Object desc = payload.get("descuento") != null ? payload.get("descuento") : payload.get("descuento_porcentaje");
            cupon.setDescuentoPorcentaje(desc != null ? Integer.valueOf(desc.toString()) : 10);

            Object limite = payload.get("limite_usos") != null ? payload.get("limite_usos") : payload.get("limite");
            cupon.setLimiteUsos(limite != null ? Integer.valueOf(limite.toString()) : 50);

            int diasValidez = Integer.parseInt(payload.getOrDefault("dias_validez", "30").toString());
            cupon.setFechaVencimiento(LocalDateTime.now().plusDays(diasValidez));

            cuponRepository.save(cupon);
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Cupón creado exitosamente."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al crear cupón: " + e.getMessage()));
        }
    }

    @DeleteMapping("/cupones/eliminar/{idCupon}")
    public ResponseEntity<?> eliminarCupon(@PathVariable Long idCupon) {
        try {
            cuponRepository.deleteById(idCupon);
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Cupón eliminado."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al eliminar cupón."));
        }
    }

    @GetMapping("/cupones/listar")
    public ResponseEntity<?> listarCupones() {
        try {
            List<Cupon> cupones = cuponRepository.findAll();
            return ResponseEntity.ok(cupones);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al listar cupones"));
        }
    }

    @GetMapping("/noticias/listar")
    public ResponseEntity<?> listarNoticias() {
        List<Noticia> ordenadas = noticiaRepository.findAll().stream()
                .sorted(Comparator.comparing((Noticia n) -> n.getPrioridad() != null ? n.getPrioridad() : 99))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ordenadas);
    }

    // Guardar Noticia vía FormData (con imagen adjunta)
    @PostMapping(value = "/noticias/guardar/{idUsuario}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> guardarNoticiaMultipart(
            @PathVariable Long idUsuario,
            @RequestParam(value = "id_noticia", required = false) Long idNoticia,
            @RequestParam("titulo") String titulo,
            @RequestParam("descripcion") String descripcion,
            @RequestParam(value = "link_destino", required = false) String linkDestino,
            @RequestParam(value = "prioridad", required = false, defaultValue = "99") Integer prioridad,
            @RequestParam(value = "foto_noticia", required = false) MultipartFile fotoNoticia
    ) {
        try {
            Noticia noticia = (idNoticia != null)
                    ? noticiaRepository.findById(idNoticia).orElse(new Noticia())
                    : new Noticia();

            noticia.setTitulo(titulo);
            noticia.setDescripcion(descripcion);
            noticia.setLinkDestino(linkDestino);
            if (noticia.getPrioridad() == null || idNoticia == null) {
                noticia.setPrioridad(prioridad);
            }
            if (noticia.getEstado() == null) {
                noticia.setEstado(true);
            }

            if (fotoNoticia != null && !fotoNoticia.isEmpty()) {
                String nombreArchivo = guardarImagenNoticia(fotoNoticia);
                noticia.setImagenUrl(nombreArchivo);
            }

            noticiaRepository.save(noticia);
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Noticia publicada correctamente en el boletín."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al guardar noticia: " + e.getMessage()));
        }
    }

    // Guardar Noticia vía JSON
    @PostMapping(value = "/noticias/guardar/{idUsuario}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> guardarNoticiaJson(@PathVariable Long idUsuario, @RequestBody Noticia noticia) {
        if (noticia.getEstado() == null) noticia.setEstado(true);
        if (noticia.getPrioridad() == null) noticia.setPrioridad(99);
        noticiaRepository.save(noticia);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Noticia publicada correctamente en el boletín."));
    }

    @PostMapping("/noticias/reordenar")
    public ResponseEntity<?> reordenarNoticias(@RequestBody List<Map<String, Object>> orden) {
        try {
            for (int i = 0; i < orden.size(); i++) {
                Map<String, Object> item = orden.get(i);
                Object idObj = item.get("id_noticia") != null ? item.get("id_noticia") : item.get("idNoticia");
                if (idObj != null) {
                    Long idNoticia = Long.valueOf(idObj.toString());
                    int prio = item.get("prioridad") != null ? Integer.parseInt(item.get("prioridad").toString()) : (i + 1);
                    noticiaRepository.findById(idNoticia).ifPresent(n -> {
                        n.setPrioridad(prio);
                        noticiaRepository.save(n);
                    });
                }
            }
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Orden de noticias actualizado."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al reordenar: " + e.getMessage()));
        }
    }

    @DeleteMapping("/noticias/eliminar/{idNoticia}/usuario/{idUsuario}")
    public ResponseEntity<?> eliminarNoticia(@PathVariable Long idNoticia, @PathVariable Long idUsuario) {
        noticiaRepository.deleteById(idNoticia);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Noticia eliminada."));
    }

    @PostMapping("/noticias/toggle/{idNoticia}/usuario/{idUsuario}")
    public ResponseEntity<?> toggleNoticia(@PathVariable Long idNoticia, @PathVariable Long idUsuario) {
        Optional<Noticia> noticiaOpt = noticiaRepository.findById(idNoticia);
        if (noticiaOpt.isEmpty()) return ResponseEntity.badRequest().build();

        Noticia noticia = noticiaOpt.get();
        noticia.setEstado(!Boolean.TRUE.equals(noticia.getEstado()));
        noticiaRepository.save(noticia);

        String mensaje = noticia.getEstado() ? "Noticia ahora es pública." : "Noticia ocultada del catálogo.";
        return ResponseEntity.ok(Map.of("success", true, "mensaje", mensaje));
    }
}
