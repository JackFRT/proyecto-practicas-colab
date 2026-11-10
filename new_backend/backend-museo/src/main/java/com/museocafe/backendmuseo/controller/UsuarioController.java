package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import com.museocafe.backendmuseo.service.UsuarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class UsuarioController {

    private final UsuarioService usuarioService;
    private final UsuarioRepository usuarioRepository;

    public UsuarioController(UsuarioService usuarioService, UsuarioRepository usuarioRepository) {
        this.usuarioService = usuarioService;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping
    public List<Usuario> listarUsuarios(@RequestParam(value = "termino", required = false) String termino) {
        if (termino != null && !termino.trim().isEmpty()) {
            return usuarioRepository.buscarClientesParaEmpleado(termino.trim());
        }
        return usuarioService.obtenerTodos();
    }

    @PostMapping
    public Usuario crearUsuario(@RequestBody Usuario usuario) {
        return usuarioService.guardarUsuario(usuario);
    }

    @PostMapping("/{id}/visita")
    public ResponseEntity<?> registrarVisita(@PathVariable Long id) {
        Optional<Usuario> opt = usuarioRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Cliente no encontrado."));
        }
        Usuario cliente = opt.get();
        LocalDate hoy = LocalDate.now();
        if (cliente.getFechaUltimaVisita() != null && cliente.getFechaUltimaVisita().isEqual(hoy)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "mensaje", "Este cliente ya registró una visita el día de hoy. ¡Debe volver mañana!"
            ));
        }
        Usuario actualizado = usuarioService.registrarVisitaPresencial(id);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "mensaje", "¡Visita presencial registrada con éxito! Se otorgó +1 giro en la ruleta.",
                "usuario", actualizado
        ));
    }
}
