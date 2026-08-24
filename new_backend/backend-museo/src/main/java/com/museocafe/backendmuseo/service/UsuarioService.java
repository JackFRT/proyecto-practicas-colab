package com.museocafe.backendmuseo.service;

import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

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

    // Regla de Negocio: 1 visita máx. al día + otorga 1 giro extra de ruleta
    public Usuario registrarVisitaPresencial(Long idUsuario) {
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + idUsuario));

        LocalDate hoy = LocalDate.now();

        if (usuario.getFechaUltimaVisita() == null || !usuario.getFechaUltimaVisita().isEqual(hoy)) {
            usuario.setVisitasPresenciales(usuario.getVisitasPresenciales() + 1);
            usuario.setFechaUltimaVisita(hoy);
            usuario.setGirosExtra(usuario.getGirosExtra() + 1);
        }

        return usuarioRepository.save(usuario);
    }
}