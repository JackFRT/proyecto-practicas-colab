package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.service.UsuarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public List<Usuario> listarUsuarios() {
        return usuarioService.obtenerTodos();
    }

    @PostMapping
    public Usuario crearUsuario(@RequestBody Usuario usuario) {
        return usuarioService.guardarUsuario(usuario);
    }

    @PostMapping("/{id}/visita")
    public ResponseEntity<Usuario> registrarVisita(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.registrarVisitaPresencial(id));
    }
}