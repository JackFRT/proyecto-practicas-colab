package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.DetallePedido;
import com.museocafe.backendmuseo.model.Pedido;
import com.museocafe.backendmuseo.model.Producto;
import com.museocafe.backendmuseo.model.ProductoVariante;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.CuponRepository;
import com.museocafe.backendmuseo.repository.NoticiaRepository;
import com.museocafe.backendmuseo.repository.PedidoRepository;
import com.museocafe.backendmuseo.repository.PremioRuletaRepository;
import com.museocafe.backendmuseo.repository.ProductoRepository;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/empleado")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class EmpleadoController {

    private final PremioRuletaRepository premioRuletaRepository;
    private final NoticiaRepository noticiaRepository;
    private final CuponRepository cuponRepository;
    private final PedidoRepository pedidoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProductoRepository productoRepository;

    public EmpleadoController(
            PedidoRepository pedidoRepository,
            UsuarioRepository usuarioRepository,
            CuponRepository cuponRepository,
            NoticiaRepository noticiaRepository,
            PremioRuletaRepository premioRuletaRepository,
            ProductoRepository productoRepository
    ) {
        this.pedidoRepository = pedidoRepository;
        this.usuarioRepository = usuarioRepository;
        this.cuponRepository = cuponRepository;
        this.noticiaRepository = noticiaRepository;
        this.premioRuletaRepository = premioRuletaRepository;
        this.productoRepository = productoRepository;
    }

    @GetMapping("/dashboard/{idEmpleado}")
    public ResponseEntity<?> obtenerDashboard(@PathVariable Long idEmpleado) {
        Map<String, Object> respuesta = new HashMap<>();

        List<Pedido> ordenesActivas = pedidoRepository.findByEstadoInOrderByFechaPedidoAsc(
                Arrays.asList("pendiente", "esperando_recojo", "preparando", "listo")
        );

        List<Pedido> todosPedidos = pedidoRepository.findAll();
        List<Pedido> historial = todosPedidos.stream()
                .filter(p -> ("recogido".equalsIgnoreCase(p.getEstado()) || "entregado".equalsIgnoreCase(p.getEstado()))
                        && (p.getEmpleadoAtencion() == null || p.getEmpleadoAtencion().getIdUsuario().equals(idEmpleado)))
                .sorted(Comparator.comparing(
                        (Pedido p) -> p.getFechaPedido() != null ? p.getFechaPedido() : LocalDateTime.MIN
                ).reversed())
                .collect(Collectors.toList());

        respuesta.put("success", true);
        respuesta.put("ordenesActivas", ordenesActivas);
        respuesta.put("historial", historial);
        respuesta.put("totalAtendidas", historial.size());
        respuesta.put("cupones", cuponRepository.findAll());
        respuesta.put("noticias", noticiaRepository.findAll());
        respuesta.put("ruleta", premioRuletaRepository.findAll());

        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/cupones/listar")
    public ResponseEntity<?> listarCupones() {
        return ResponseEntity.ok(cuponRepository.findAll());
    }

    @PostMapping("/ordenes/estado")
    public ResponseEntity<?> cambiarEstadoOrden(@RequestBody Map<String, Object> payload) {
        Object idObj = payload.get("id_reserva") != null ? payload.get("id_reserva") : payload.get("idPedido");
        if (idObj == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "ID de orden no especificado."));
        }
        Long idReserva = Long.valueOf(idObj.toString());
        return procesarCambioEstado(idReserva, payload);
    }

    @PostMapping("/ordenes/{idReserva}/estado")
    public ResponseEntity<?> cambiarEstadoOrdenPorPath(
            @PathVariable Long idReserva,
            @RequestBody Map<String, Object> payload
    ) {
        return procesarCambioEstado(idReserva, payload);
    }

    private ResponseEntity<?> procesarCambioEstado(Long idReserva, Map<String, Object> payload) {
        String accion = payload.get("accion") != null ? payload.get("accion").toString() : "";
        Long idEmpleado = payload.get("id_empleado") != null ? Long.valueOf(payload.get("id_empleado").toString()) : null;

        Optional<Pedido> pedidoOpt = pedidoRepository.findById(idReserva);
        if (pedidoOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Orden no encontrada."));
        }

        Pedido pedido = pedidoOpt.get();
        if (idEmpleado != null) {
            usuarioRepository.findById(idEmpleado).ifPresent(pedido::setEmpleadoAtencion);
        }

        String mensaje;
        switch (accion) {
            case "aprobar":
            case "listo":
                pedido.setEstado("esperando_recojo");
                mensaje = "Pago aprobado. La orden está lista para recojo.";
                break;
            case "completar":
                pedido.setEstado("recogido");
                mensaje = "Orden entregada y archivada en tu historial.";
                break;
            case "cancelar":
            case "reportar":
                if (!"cancelado".equalsIgnoreCase(pedido.getEstado())) {
                    devolverStockPedido(pedido);
                }
                pedido.setEstado("cancelado");
                if ("reportar".equals(accion) && pedido.getUsuario() != null) {
                    Usuario u = pedido.getUsuario();
                    u.setBloqueadoHasta(LocalDateTime.now().plusDays(7));
                    usuarioRepository.save(u);
                    mensaje = "Orden cancelada, stock restaurado y cuenta bloqueada por 7 días.";
                } else {
                    mensaje = "Orden cancelada y stock restaurado al inventario.";
                }
                break;
            default:
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Acción no válida: " + accion));
        }

        pedidoRepository.save(pedido);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", mensaje, "estado", pedido.getEstado()));
    }

    private void devolverStockPedido(Pedido pedido) {
        if (pedido.getDetalles() == null) return;
        for (DetallePedido det : pedido.getDetalles()) {
            Producto prod = det.getProducto();
            if (prod != null) {
                int cant = det.getCantidad() != null ? det.getCantidad() : 0;
                String estilo = det.getEstiloSeleccionado() != null ? det.getEstiloSeleccionado() : "Estándar";
                boolean varianteActualizada = false;
                if (prod.getVariantes() != null && !prod.getVariantes().isEmpty()) {
                    for (ProductoVariante pv : prod.getVariantes()) {
                        if (pv.getNombreVariante() != null && pv.getNombreVariante().equalsIgnoreCase(estilo)) {
                            pv.setStock((pv.getStock() != null ? pv.getStock() : 0) + cant);
                            varianteActualizada = true;
                            break;
                        }
                    }
                    if (!varianteActualizada) {
                        ProductoVariante primera = prod.getVariantes().get(0);
                        primera.setStock((primera.getStock() != null ? primera.getStock() : 0) + cant);
                    }
                }
                prod.setStock((prod.getStock() != null ? prod.getStock() : 0) + cant);
                productoRepository.save(prod);
            }
        }
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

        cliente.setVisitasPresenciales((cliente.getVisitasPresenciales() != null ? cliente.getVisitasPresenciales() : 0) + 1);
        cliente.setFechaUltimaVisita(hoy);
        cliente.setGirosExtra((cliente.getGirosExtra() != null ? cliente.getGirosExtra() : 0) + 1);

        usuarioRepository.save(cliente);

        return ResponseEntity.ok(Map.of("success", true, "mensaje", "¡Visita presencial registrada con éxito! (+1 Giro Extra)"));
    }
}
