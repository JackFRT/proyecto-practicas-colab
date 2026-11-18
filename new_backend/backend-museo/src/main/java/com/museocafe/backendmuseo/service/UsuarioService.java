package com.museocafe.backendmuseo.service;

import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public List<Usuario> obtenerTodos() {
        return usuarioRepository.findAll();
    }

    public Usuario guardarUsuario(Usuario usuario) {
        return usuarioRepository.save(usuario);
    }

    public List<Map<String, Object>> buscarClientesConPrivacidad(String termino) {
        if (termino == null || termino.trim().isEmpty()) {
            return new ArrayList<>();
        }
        String queryNorm = normalizar(termino.trim());

        return usuarioRepository.findAll().stream()
                .filter(u -> {
                    String rol = u.getRol() != null ? u.getRol().toLowerCase() : "cliente";
                    if (!rol.equals("cliente") && !rol.equals("admin")) {
                        return false;
                    }
                    String nombre = normalizar(u.getNombre());
                    String email = normalizar(u.getEmail());
                    String dni = normalizar(u.getDni());

                    return nombre.contains(queryNorm)
                            || email.contains(queryNorm)
                            || dni.contains(queryNorm);
                })
                .limit(15)
                .map(u -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("idUsuario", u.getIdUsuario());
                    item.put("id_usuario", u.getIdUsuario());
                    item.put("nombre", u.getNombre());
                    item.put("visitas_presenciales", u.getVisitasPresenciales() != null ? u.getVisitasPresenciales() : 0);
                    item.put("giros_extra", u.getGirosExtra() != null ? u.getGirosExtra() : 0);
                    item.put("fecha_ultima_visita", u.getFechaUltimaVisita());
                    // Privacidad: solo se envía una pequeña pista enmascarada del correo y DNI
                    item.put("email", enmascararEmail(u.getEmail()));
                    item.put("dni", enmascararDni(u.getDni()));
                    return item;
                })
                .collect(Collectors.toList());
    }

    private String normalizar(String texto) {
        if (texto == null) return "";
        String norm = Normalizer.normalize(texto, Normalizer.Form.NFD);
        return norm.replaceAll("\\p{InCombiningDiacriticalMarks}+", "").toLowerCase().trim();
    }

    public String enmascararEmail(String email) {
        if (email == null || email.trim().isEmpty() || !email.contains("@")) {
            return "•••@•••";
        }
        String[] partes = email.trim().split("@", 2);
        String usuario = partes[0];
        String dominio = partes[1];
        String prefijo = usuario.length() <= 2 ? usuario.substring(0, 1) : usuario.substring(0, 2);
        String domCorta = dominio.length() > 3 ? dominio.substring(dominio.length() - 3) : dominio;
        return prefijo + "••••@•••" + domCorta;
    }

    public String enmascararDni(String dni) {
        if (dni == null || dni.trim().isEmpty()) {
            return "";
        }
        String limpio = dni.trim();
        if (limpio.length() <= 2) {
            return "••••••" + limpio;
        }
        return "••••••" + limpio.substring(limpio.length() - 2);
    }

    public Usuario registrarVisitaPresencial(Long idUsuario) {
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + idUsuario));

        LocalDate hoy = LocalDate.now();
        int visitasActuales = usuario.getVisitasPresenciales() != null ? usuario.getVisitasPresenciales() : 0;
        int girosActuales = usuario.getGirosExtra() != null ? usuario.getGirosExtra() : 0;

        if (usuario.getFechaUltimaVisita() == null || !usuario.getFechaUltimaVisita().isEqual(hoy)) {
            usuario.setVisitasPresenciales(visitasActuales + 1);
            usuario.setFechaUltimaVisita(hoy);
            usuario.setGirosExtra(girosActuales + 1);
        }

        return usuarioRepository.save(usuario);
    }
}
