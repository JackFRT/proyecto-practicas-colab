package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Pedido;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.PedidoRepository;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/empleado")
/* =========================================================================================
   [PRODUCCIÓN - DOMINIO] 
   Cuando tengas tu dominio, cambia los orígenes para que solo tu web pueda consultar esta API.
   Ejemplo final: @CrossOrigin(origins = {"http://localhost:4200", "https://www.cafeayacuchano.com"})
   ========================================================================================= */
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class EmpleadoController {

    private final PedidoRepository pedidoRepository;
    private final UsuarioRepository usuarioRepository;

    public EmpleadoController(PedidoRepository pedidoRepository, UsuarioRepository usuarioRepository) {
        this.pedidoRepository = pedidoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping("/dashboard/{idEmpleado}")
    public ResponseEntity<?> obtenerDashboard(@PathVariable Long idEmpleado) {
        Map<String, Object> respuesta = new HashMap<>();

        List<Pedido> ordenesActivas = pedidoRepository.findByEstadoInOrderByFechaPedidoAsc(
                Arrays.asList("pendiente", "preparando", "listo")
        );
        
        List<Pedido> historial = pedidoRepository.findByEmpleadoAtencionIdUsuarioAndEstadoOrderByFechaPedidoDesc(idEmpleado, "entregado");

        respuesta.put("success", true);
        respuesta.put("ordenesActivas", ordenesActivas);
        respuesta.put("historial", historial);
        respuesta.put("totalAtendidas", historial.size());

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/ordenes/estado")
    public ResponseEntity<?> cambiarEstadoOrden(@RequestBody Map<String, Object> payload) {
        Long idReserva = Long.valueOf(payload.get("id_reserva").toString());
        String accion = payload.get("accion").toString();

        /* 
         * -------------------------------------------------------------------
         * SEGURIDAD AVANZADA (Opcional para el futuro):
         * En lugar de confiar en el id_empleado que manda Angular, leemos el 
         * token JWT para saber exactamente qué empleado hizo la petición.
         * 
         * Authentication auth = SecurityContextHolder.getContext().getAuthentication();
         * String emailEmpleadoLogueado = auth.getName();
         * Optional<Usuario> empleadoOpt = usuarioRepository.findByEmail(emailEmpleadoLogueado);
         * -------------------------------------------------------------------
         */

        // Lógica actual (Recibiendo el ID desde Angular)
        Long idEmpleado = Long.valueOf(payload.get("id_empleado").toString());
        Optional<Usuario> empleadoOpt = usuarioRepository.findById(idEmpleado);
        Optional<Pedido> pedidoOpt = pedidoRepository.findById(idReserva);

        if (pedidoOpt.isEmpty() || empleadoOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Orden o empleado no encontrados."));
        }

        Pedido pedido = pedidoOpt.get();
        pedido.setEmpleadoAtencion(empleadoOpt.get());

        String mensaje = "";
        switch (accion) {
            case "aprobar":
                pedido.setEstado("preparando");
                mensaje = "Orden en preparación.";
                break;
            case "listo":
                pedido.setEstado("listo");
                mensaje = "Orden lista para entregar.";
                break;
            case "completar":
                pedido.setEstado("entregado");
                mensaje = "Orden entregada con éxito.";
                break;
            case "cancelar":
            case "reportar":
                pedido.setEstado("cancelado");
                mensaje = "Orden cancelada" + (accion.equals("reportar") ? " y usuario reportado." : ".");
                break;
            default:
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Acción no válida."));
        }

        pedidoRepository.save(pedido);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", mensaje));
    }

    @PostMapping("/clientes/buscar")
    public ResponseEntity<?> buscarClientes(@RequestBody Map<String, String> payload) {
        String termino = payload.getOrDefault("termino", "");
        List<Usuario> clientes = usuarioRepository.buscarClientesParaEmpleado(termino);
        return ResponseEntity.ok(Map.of("success", true, "clientes", clientes));
    }

    @PostMapping("/clientes/{idCliente}/visita")
    public ResponseEntity<?> registrarVisitaCliente(@PathVariable Long idCliente) {
        Optional<Usuario> clienteOpt = usuarioRepository.findById(idCliente);
        
        if (clienteOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Cliente no encontrado."));
        }

        Usuario cliente = clienteOpt.get();
        LocalDate hoy = LocalDate.now();

        if (cliente.getFechaUltimaVisita() != null && cliente.getFechaUltimaVisita().equals(hoy)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Este cliente ya registró una visita el día de hoy. ¡Debe volver mañana!"));
        }

        cliente.setVisitasPresenciales(cliente.getVisitasPresenciales() + 1);
        cliente.setFechaUltimaVisita(hoy);
        cliente.setGirosExtra(cliente.getGirosExtra() + 1); 

        usuarioRepository.save(cliente);

        return ResponseEntity.ok(Map.of("success", true, "mensaje", "¡Visita presencial registrada con éxito!"));
    }
}