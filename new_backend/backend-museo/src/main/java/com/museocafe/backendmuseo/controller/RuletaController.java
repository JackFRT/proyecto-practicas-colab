package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Cupon;
import com.museocafe.backendmuseo.model.PremioRuleta;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.CuponRepository;
import com.museocafe.backendmuseo.repository.PremioRuletaRepository;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/ruleta")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class RuletaController {

    private final PremioRuletaRepository premioRuletaRepository;
    private final UsuarioRepository usuarioRepository;
    private final CuponRepository cuponRepository;

    public RuletaController(
            PremioRuletaRepository premioRuletaRepository,
            UsuarioRepository usuarioRepository,
            CuponRepository cuponRepository
    ) {
        this.premioRuletaRepository = premioRuletaRepository;
        this.usuarioRepository = usuarioRepository;
        this.cuponRepository = cuponRepository;
    }

    @GetMapping("/premios")
    public ResponseEntity<List<PremioRuleta>> listarPremios() {
        return ResponseEntity.ok(premioRuletaRepository.findAll());
    }

    @GetMapping("/cargar/{idUsuario}")
    public ResponseEntity<?> cargarEstadoRuleta(@PathVariable Long idUsuario) {
        List<PremioRuleta> premios = premioRuletaRepository.findAll();
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(idUsuario);

        boolean puedeGirar = false;
        int girosExtra = 0;
        long diasRestantes = 0;

        if (usuarioOpt.isPresent()) {
            Usuario u = usuarioOpt.get();
            girosExtra = u.getGirosExtra() != null ? u.getGirosExtra() : 0;
            if ("admin".equalsIgnoreCase(u.getRol())) {
                puedeGirar = true;
            } else if (girosExtra > 0) {
                puedeGirar = true;
            } else if (u.getFechaUltimoGiro() == null) {
                puedeGirar = true;
            } else {
                long dias = ChronoUnit.DAYS.between(u.getFechaUltimoGiro(), LocalDateTime.now());
                if (dias >= 7) {
                    puedeGirar = true;
                } else {
                    diasRestantes = 7 - dias;
                }
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("premios", premios);
        res.put("puede_girar", puedeGirar);
        res.put("giros_extra", girosExtra);
        res.put("dias_restantes", diasRestantes);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/girar/{idUsuario}")
    public ResponseEntity<?> girarRuleta(@PathVariable Long idUsuario) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(idUsuario);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Usuario no encontrado."));
        }

        Usuario usuario = usuarioOpt.get();
        boolean esAdmin = "admin".equalsIgnoreCase(usuario.getRol());
        int girosExtra = usuario.getGirosExtra() != null ? usuario.getGirosExtra() : 0;
        boolean usaGiroExtra = false;

        if (!esAdmin) {
            if (girosExtra > 0) {
                usaGiroExtra = true;
            } else if (usuario.getFechaUltimoGiro() != null) {
                long dias = ChronoUnit.DAYS.between(usuario.getFechaUltimoGiro(), LocalDateTime.now());
                if (dias < 7) {
                    long faltan = 7 - dias;
                    return ResponseEntity.badRequest().body(Map.of(
                            "success", false,
                            "mensaje", "Ya usaste tu giro semanal. Vuelve en " + faltan + " día(s) o solicita un giro extra en tienda."
                    ));
                }
            }
        }

        List<PremioRuleta> premios = premioRuletaRepository.findAll();
        PremioRuleta premioGanado;

        if (premios.isEmpty()) {
            premioGanado = new PremioRuleta();
            premioGanado.setTitulo("10% Dscto");
            premioGanado.setDescuentoPorcentaje(10);
            premioGanado.setColorSeccion("#e74c3c");
        } else {
            double totalPeso = premios.stream()
                    .mapToDouble(p -> p.getProbabilidad() != null && p.getProbabilidad() > 0 ? p.getProbabilidad() : 10.0)
                    .sum();
            double rand = Math.random() * totalPeso;
            double acumulado = 0.0;
            premioGanado = premios.get(premios.size() - 1);
            for (PremioRuleta p : premios) {
                double peso = (p.getProbabilidad() != null && p.getProbabilidad() > 0) ? p.getProbabilidad() : 10.0;
                acumulado += peso;
                if (rand <= acumulado) {
                    premioGanado = p;
                    break;
                }
            }
        }

        // Actualizar el estado de giro del usuario
        if (usaGiroExtra) {
            usuario.setGirosExtra(girosExtra - 1);
        } else {
            usuario.setFechaUltimoGiro(LocalDateTime.now());
        }
        usuarioRepository.save(usuario);

        int descuento = premioGanado.getDescuentoPorcentaje() != null ? premioGanado.getDescuentoPorcentaje() : 0;
        String codigoGenerado = null;

        if (descuento > 0) {
            codigoGenerado = "RUL-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();
            Cupon nuevoCupon = new Cupon();
            nuevoCupon.setCodigo(codigoGenerado);
            nuevoCupon.setDescuentoPorcentaje(descuento);
            nuevoCupon.setLimiteUsos(1);
            nuevoCupon.setUsosActuales(0);
            nuevoCupon.setFechaVencimiento(LocalDateTime.now().plusDays(15));
            nuevoCupon.setUsuario(usuario);
            cuponRepository.save(nuevoCupon);
        }

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("success", true);
        respuesta.put("premio", premioGanado);
        respuesta.put("descuento", descuento);
        respuesta.put("codigo_cupon", codigoGenerado);
        respuesta.put("giros_extra", usuario.getGirosExtra());
        respuesta.put("mensaje", descuento > 0
                ? "¡Felicidades! Ganaste " + premioGanado.getTitulo() + " (" + descuento + "% de descuento)."
                : "¡Casi! Sigue intentando en tu próximo giro.");

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/guardar")
    public ResponseEntity<?> guardarPremio(@RequestBody Map<String, Object> payload) {
        try {
            PremioRuleta premio = new PremioRuleta();
            boolean esNuevoRegistro = true;

            Object idRaw = payload.get("id_premio") != null ? payload.get("id_premio") : payload.get("idPremio");
            if (idRaw != null) {
                String idStr = idRaw.toString().trim();
                if (!idStr.isEmpty() && !idStr.equalsIgnoreCase("undefined") && !idStr.equalsIgnoreCase("null")) {
                    Long id = Long.valueOf(idStr);
                    if (id > 0) {
                        premio = premioRuletaRepository.findById(id).orElse(new PremioRuleta());
                        premio.setIdPremio(id);
                        esNuevoRegistro = false;
                    }
                }
            }

            Object tituloObj = payload.get("titulo") != null ? payload.get("titulo") : payload.get("titulo_premio");
            Object descObj = payload.get("descuento_porcentaje") != null ? payload.get("descuento_porcentaje") : payload.get("descuento_premio");
            Object colorObj = payload.get("color_seccion") != null ? payload.get("color_seccion") : payload.get("color_premio");

            if (tituloObj == null || tituloObj.toString().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "El título del premio es obligatorio."));
            }

            premio.setTitulo(tituloObj.toString().trim());
            int descVal = 0;
            if (descObj != null && !descObj.toString().trim().isEmpty()) {
                try {
                    descVal = (int) Math.round(Double.parseDouble(descObj.toString().trim()));
                } catch (NumberFormatException ignored) {
                }
            }
            premio.setDescuentoPorcentaje(descVal);
            premio.setColorSeccion(colorObj != null && !colorObj.toString().trim().isEmpty() ? colorObj.toString().trim() : "#22c55e");
            premio.setActivo(true);

            if (payload.get("probabilidad") != null && !payload.get("probabilidad").toString().trim().isEmpty()) {
                premio.setProbabilidad(Double.valueOf(payload.get("probabilidad").toString().trim()));
            } else if (esNuevoRegistro) {
                long totalExistentes = premioRuletaRepository.count();
                premio.setProbabilidad(totalExistentes == 0 ? 100.0 : 0.0);
            }

            PremioRuleta guardado = premioRuletaRepository.save(premio);
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Premio de la ruleta guardado con éxito.", "premio", guardado));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al guardar premio: " + e.getMessage()));
        }
    }

    @DeleteMapping("/eliminar/{idPremio}")
    public ResponseEntity<?> eliminarPremio(@PathVariable Long idPremio) {
        try {
            premioRuletaRepository.deleteById(idPremio);
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Premio eliminado de la ruleta."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al eliminar el premio."));
        }
    }

    @PostMapping("/probabilidades")
    public ResponseEntity<?> guardarProbabilidades(@RequestBody Object body) {
        try {
            List<?> lista = null;
            if (body instanceof List<?>) {
                lista = (List<?>) body;
            } else if (body instanceof Map<?, ?> map && map.get("premios") instanceof List<?>) {
                lista = (List<?>) map.get("premios");
            }

            if (lista != null) {
                for (Object item : lista) {
                    if (item instanceof Map<?, ?> m) {
                        Object idObj = m.get("id_premio") != null ? m.get("id_premio") : m.get("idPremio");
                        Object probObj = m.get("probabilidad");
                        if (idObj != null && probObj != null) {
                            Long id = Long.valueOf(idObj.toString());
                            Double prob = Double.valueOf(probObj.toString());
                            premioRuletaRepository.findById(id).ifPresent(p -> {
                                p.setProbabilidad(prob);
                                premioRuletaRepository.save(p);
                            });
                        }
                    }
                }
            }
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Probabilidades de la ruleta actualizadas."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al guardar probabilidades: " + e.getMessage()));
        }
    }
}
