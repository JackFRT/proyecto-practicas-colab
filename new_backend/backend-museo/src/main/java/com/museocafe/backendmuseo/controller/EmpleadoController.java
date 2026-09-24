package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Pedido;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.PedidoRepository;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/empleado")
@CrossOrigin(origins = "*")
public class EmpleadoController {

    private final PedidoRepository pedidoRepository;
    private final UsuarioRepository usuarioRepository;

    public EmpleadoController(PedidoRepository pedidoRepository, UsuarioRepository usuarioRepository) {
        this.pedidoRepository = pedidoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    // 1. CARGAR DASHBOARD (Reemplaza a obtener_dashboard.php)
    @GetMapping("/dashboard/{idEmpleado}")
    public ResponseEntity<?> obtenerDashboard(@PathVariable Long idEmpleado) {
        Map<String, Object> respuesta = new HashMap<>();

        // Trae solo las órdenes activas (pendientes, preparándose o listas)
        List<Pedido> ordenesActivas = pedidoRepository.findByEstadoInOrderByFechaPedidoAsc(
                Arrays.asList("pendiente", "preparando", "listo")
        );
        
        // Historial del empleado (Solo las entregadas)
        List<Pedido> historial = pedidoRepository.findByEmpleadoAtencionIdUsuarioAndEstadoOrderByFechaPedidoDesc(idEmpleado, "entregado");

        respuesta.put("success", true);
        respuesta.put("ordenesActivas", ordenesActivas);
        respuesta.put("historial", historial);
        respuesta.put("totalAtendidas", historial.size()); // Estadística rápida para el empleado

        return ResponseEntity.ok(respuesta);
    }

    // 2. GESTIÓN DE ÓRDENES (Reemplaza a ordenes_api.php - aprobar, completar, cancelar, reportar)
    @PostMapping("/ordenes/estado")
    public ResponseEntity<?> cambiarEstadoOrden(@RequestBody Map<String, Object> payload) {
        Long idReserva = Long.valueOf(payload.get("id_reserva").toString());
        Long idEmpleado = Long.valueOf(payload.get("id_empleado").toString());
        String accion = payload.get("accion").toString();

        Optional<Pedido> pedidoOpt = pedidoRepository.findById(idReserva);
        Optional<Usuario> empleadoOpt = usuarioRepository.findById(idEmpleado);

        if (pedidoOpt.isEmpty() || empleadoOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Orden o empleado no encontrados."));
        }

        Pedido pedido = pedidoOpt.get();
        pedido.setEmpleadoAtencion(empleadoOpt.get()); // Registramos quién atendió la orden

        String mensaje = "";
        switch (accion) {
            case "aprobar":
                pedido.setEstado("preparando"); // Nuevo estado para la cafetería
                mensaje = "Orden en preparación.";
                break;
            case "listo":
                pedido.setEstado("listo"); // Listo para ser entregado
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

    // 3. BUSCADOR DE CLIENTES EN VIVO (Reemplaza a buscar_clientes)
    @PostMapping("/clientes/buscar")
    public ResponseEntity<?> buscarClientes(@RequestBody Map<String, String> payload) {
        String termino = payload.getOrDefault("termino", "");
        List<Usuario> clientes = usuarioRepository.buscarClientesParaEmpleado(termino);
        return ResponseEntity.ok(Map.of("success", true, "clientes", clientes));
    }

    // 4. REGISTRAR VISITA PRESENCIAL (Reemplaza a registrar_visita)
    @PostMapping("/clientes/{idCliente}/visita")
    public ResponseEntity<?> registrarVisitaCliente(@PathVariable Long idCliente) {
        Optional<Usuario> clienteOpt = usuarioRepository.findById(idCliente);
        
        if (clienteOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Cliente no encontrado."));
        }

        Usuario cliente = clienteOpt.get();
        LocalDate hoy = LocalDate.now();

        // Validamos que no haya registrado visita hoy mismo[cite: 23]
        if (cliente.getFechaUltimaVisita() != null && cliente.getFechaUltimaVisita().equals(hoy)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Este cliente ya registró una visita el día de hoy. ¡Debe volver mañana!"));
        }

        // Subimos el nivel de socio y le damos un giro para la ruleta
        cliente.setVisitasPresenciales(cliente.getVisitasPresenciales() + 1);
        cliente.setFechaUltimaVisita(hoy);
        cliente.setGirosExtra(cliente.getGirosExtra() + 1); 

        usuarioRepository.save(cliente);

        return ResponseEntity.ok(Map.of("success", true, "mensaje", "¡Visita presencial registrada con éxito!"));
    }
}