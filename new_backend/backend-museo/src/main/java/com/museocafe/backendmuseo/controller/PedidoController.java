package com.museocafe.backendmuseo.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.museocafe.backendmuseo.model.*;
import com.museocafe.backendmuseo.repository.*;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/pedidos")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class PedidoController {

    private final PedidoRepository pedidoRepository;
    private final DetallePedidoRepository detallePedidoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProductoRepository productoRepository;
    private final CuponRepository cuponRepository;

    public PedidoController(
            PedidoRepository pedidoRepository,
            DetallePedidoRepository detallePedidoRepository,
            UsuarioRepository usuarioRepository,
            ProductoRepository productoRepository,
            CuponRepository cuponRepository
    ) {
        this.pedidoRepository = pedidoRepository;
        this.detallePedidoRepository = detallePedidoRepository;
        this.usuarioRepository = usuarioRepository;
        this.productoRepository = productoRepository;
        this.cuponRepository = cuponRepository;
    }

    private Optional<Pedido> buscarPedidoPorIdOCodigo(String idOrCodigo) {
        Optional<Pedido> opt = pedidoRepository.findByCodigoTicket(idOrCodigo);
        if (opt.isPresent()) return opt;
        try {
            Long id = Long.valueOf(idOrCodigo);
            return pedidoRepository.findById(id);
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    @GetMapping("/detalle/{idOrCodigo}")
    public ResponseEntity<?> obtenerTicketJson(@PathVariable String idOrCodigo) {
        Optional<Pedido> pedidoOpt = buscarPedidoPorIdOCodigo(idOrCodigo);
        if (pedidoOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Ticket no encontrado"));
        }

        Pedido pedido = pedidoOpt.get();
        List<DetallePedido> detalles = detallePedidoRepository.findByPedidoIdPedido(pedido.getIdPedido());

        Map<String, Object> ticket = new HashMap<>();
        ticket.put("id_reserva", pedido.getIdPedido());
        ticket.put("codigo", pedido.getCodigoTicket());
        ticket.put("fecha", pedido.getFechaPedido());
        ticket.put("cliente", pedido.getUsuario() != null ? pedido.getUsuario().getNombre() : "Cliente");
        ticket.put("tipoConsumo", pedido.getTipoConsumo());
        ticket.put("tipoComprobante", pedido.getTipoComprobante());
        ticket.put("dniOpcional", pedido.getDniOpcional());
        ticket.put("total", pedido.getTotalPagado());
        ticket.put("estado", pedido.getEstado());
        ticket.put("items", detalles);

        return ResponseEntity.ok(ticket);
    }

    @GetMapping(value = {"/ticket/{idOrCodigo}", "/comprobante/{idOrCodigo}"}, produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> generarComprobanteHtml(@PathVariable String idOrCodigo) {
        Optional<Pedido> pedidoOpt = buscarPedidoPorIdOCodigo(idOrCodigo);
        if (pedidoOpt.isEmpty()) {
            return ResponseEntity.status(404).body("<html><body style='font-family:sans-serif;text-align:center;padding:40px;'><h2>Comprobante no encontrado</h2></body></html>");
        }

        Pedido p = pedidoOpt.get();
        List<DetallePedido> detalles = detallePedidoRepository.findByPedidoIdPedido(p.getIdPedido());

        String tipoDoc = "factura".equalsIgnoreCase(p.getTipoComprobante()) ? "FACTURA ELECTRÓNICA" : "BOLETA DE VENTA ELECTRÓNICA";
        String labelDoc = "factura".equalsIgnoreCase(p.getTipoComprobante()) ? "RUC" : "DNI";
        String numOrden = String.format("%06d", p.getIdPedido());
        String fecha = p.getFechaPedido() != null
                ? p.getFechaPedido().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                : LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String clienteNombre = p.getUsuario() != null ? p.getUsuario().getNombre() : "Cliente General";
        String clienteEmail = p.getUsuario() != null ? p.getUsuario().getEmail() : "-";
        String docCliente = (p.getDniOpcional() != null && !p.getDniOpcional().isBlank())
                ? p.getDniOpcional()
                : (p.getUsuario() != null && p.getUsuario().getDni() != null ? p.getUsuario().getDni() : "No especificado");
        String cajero = p.getEmpleadoAtencion() != null ? p.getEmpleadoAtencion().getNombre() : "Validado por Sistema";

        StringBuilder filasHtml = new StringBuilder();
        BigDecimal subtotalBruto = BigDecimal.ZERO;

        for (DetallePedido d : detalles) {
            int cant = d.getCantidad() != null ? d.getCantidad() : 1;
            BigDecimal unit = d.getPrecioUnitario() != null ? d.getPrecioUnitario() : BigDecimal.ZERO;
            BigDecimal sub = unit.multiply(BigDecimal.valueOf(cant)).setScale(2, RoundingMode.HALF_UP);
            subtotalBruto = subtotalBruto.add(sub);

            String nombreProd = d.getProducto() != null ? d.getProducto().getNombre() : "Producto";
            String estilo = (d.getEstiloSeleccionado() != null && !"Estándar".equalsIgnoreCase(d.getEstiloSeleccionado()))
                    ? " <small style='color:#666;'>(" + d.getEstiloSeleccionado() + ")</small>"
                    : "";

            filasHtml.append("<tr>")
                    .append("<td>").append(cant).append("</td>")
                    .append("<td>").append(nombreProd).append(estilo).append("</td>")
                    .append("<td style='text-align:right;'>S/ ").append(unit.setScale(2, RoundingMode.HALF_UP)).append("</td>")
                    .append("<td style='text-align:right;'>S/ ").append(sub).append("</td>")
                    .append("</tr>");
        }

        BigDecimal totalPagado = p.getTotalPagado() != null ? p.getTotalPagado().setScale(2, RoundingMode.HALF_UP) : subtotalBruto;
        BigDecimal ahorro = subtotalBruto.subtract(totalPagado);

        StringBuilder descuentoHtml = new StringBuilder();
        if (ahorro.compareTo(new BigDecimal("0.05")) > 0) {
            String cuponLabel = (p.getCodigoCupon() != null && !p.getCodigoCupon().isBlank()) ? " (" + p.getCodigoCupon() + ")" : "";
            descuentoHtml.append("<p style='margin:5px 0;font-size:13px;color:#555;'>SUBTOTAL: S/ ").append(subtotalBruto.setScale(2, RoundingMode.HALF_UP)).append("</p>");
            descuentoHtml.append("<p style='margin:5px 0;font-size:13px;color:#27ae60;font-weight:bold;'>DESCUENTO").append(cuponLabel).append(": - S/ ").append(ahorro.setScale(2, RoundingMode.HALF_UP)).append("</p>");
        }

        String html = """
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>Comprobante #%s - Café Ayacuchano & Cactus Museum</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; background: #f4f4f4; padding: 20px; display: flex; justify-content: center; }
                        .ticket { background: #fff; width: 380px; padding: 25px; border-radius: 6px; box-shadow: 0 5px 20px rgba(0,0,0,0.12); border-top: 6px solid #2e7d32; }
                        .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 15px; margin-bottom: 15px; }
                        .header h2 { margin: 0; color: #1b5e20; font-size: 20px; }
                        .header p { margin: 4px 0; font-size: 12px; color: #555; }
                        .tipo-doc { font-weight: bold; font-size: 15px; background: #eee; padding: 6px; margin-top: 10px; border-radius: 4px; }
                        .info { font-size: 12px; line-height: 1.6; margin-bottom: 15px; border-bottom: 2px dashed #ccc; padding-bottom: 15px; }
                        .table { width: 100%%; font-size: 12px; border-collapse: collapse; margin-bottom: 15px; }
                        .table th { border-bottom: 1px solid #000; padding-bottom: 5px; text-align: left; }
                        .table td { padding: 6px 0; border-bottom: 1px dotted #eee; }
                        .totales { border-top: 2px solid #000; padding-top: 10px; text-align: right; }
                        .totales .final { font-size: 18px; font-weight: bold; color: #1b5e20; margin: 6px 0; }
                        .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #777; border-top: 1px solid #eee; padding-top: 10px; }
                        .btn-print { display: block; width: 100%%; background: #2e7d32; color: #fff; text-align: center; padding: 12px; border: none; border-radius: 5px; font-size: 15px; font-weight: bold; cursor: pointer; margin-bottom: 15px; }
                        @media print {
                            body { background: #fff; padding: 0; }
                            .ticket { box-shadow: none; width: 100%%; border: none; }
                            .btn-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div>
                        <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
                        <div class="ticket">
                            <div class="header">
                                <h2>☕🌵 CAFÉ AYACUCHANO & CACTUS MUSEUM</h2>
                                <p>Jr. Asamblea 245 - Ayacucho, Perú</p>
                                <p>RUC: 20601234567</p>
                                <div class="tipo-doc">%s<br>N° B001-%s</div>
                            </div>
                            <div class="info">
                                <strong>FECHA DE EMISIÓN:</strong> %s<br>
                                <strong>CLIENTE:</strong> %s<br>
                                <strong>%s:</strong> %s<br>
                                <strong>CORREO:</strong> %s<br>
                                <strong>ATENDIDO POR:</strong> %s<br>
                                <strong>ESTADO:</strong> %s
                            </div>
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>CANT</th>
                                        <th>DESCRIPCIÓN</th>
                                        <th style="text-align: right;">P.UNIT</th>
                                        <th style="text-align: right;">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    %s
                                </tbody>
                            </table>
                            <div class="totales">
                                %s
                                <p class="final">TOTAL PAGADO: S/ %s</p>
                                <p style="font-size:10px; color:#888; margin:4px 0;">(Incluye IGV 18%%)</p>
                            </div>
                            <div class="footer">
                                <p>¡Gracias por tu compra!</p>
                                <p>Conserva este comprobante para el recojo en tienda.</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(
                numOrden,
                tipoDoc,
                numOrden,
                fecha,
                clienteNombre,
                labelDoc,
                docCliente,
                clienteEmail,
                cajero,
                p.getEstado() != null ? p.getEstado().toUpperCase() : "PENDIENTE",
                filasHtml.toString(),
                descuentoHtml.toString(),
                totalPagado.toString()
        );

        return ResponseEntity.ok(html);
    }

    @PostMapping("/validar-cupon")
    public ResponseEntity<?> validarCupon(@RequestBody Map<String, Object> payload) {
        String codigo = payload.get("codigo") != null ? payload.get("codigo").toString().trim() : "";
        Long idUsuario = payload.get("id_usuario") != null ? Long.valueOf(payload.get("id_usuario").toString()) : null;

        if (codigo.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Ingresa un código de cupón."));
        }

        Optional<Cupon> cuponOpt = cuponRepository.findByCodigoIgnoreCase(codigo);
        if (cuponOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "El cupón ingresado no existe."));
        }

        Cupon cupon = cuponOpt.get();
        int usos = cupon.getUsosActuales() != null ? cupon.getUsosActuales() : 0;
        int limite = cupon.getLimiteUsos() != null ? cupon.getLimiteUsos() : 1;

        if (usos >= limite) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Este cupón ya alcanzó su límite de usos."));
        }

        if (cupon.getFechaVencimiento() != null && cupon.getFechaVencimiento().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Este cupón ha expirado."));
        }

        if (cupon.getUsuario() != null && idUsuario != null && !cupon.getUsuario().getIdUsuario().equals(idUsuario)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Este cupón pertenece a otro usuario."));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "codigo", cupon.getCodigo(),
                "descuento_porcentaje", cupon.getDescuentoPorcentaje(),
                "mensaje", "¡Cupón de " + cupon.getDescuentoPorcentaje() + "% aplicado con éxito!"
        ));
    }

    private String guardarComprobante(MultipartFile archivo, Long idUsuario) throws Exception {
        if (archivo == null || archivo.isEmpty()) return null;
        String nombreArchivo = "yape_" + idUsuario + "_" + System.currentTimeMillis() + ".jpg";

        Path dirUploads = Paths.get("uploads/images/comprobantes");
        Files.createDirectories(dirUploads);
        Path destino = dirUploads.resolve(nombreArchivo);
        Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);

        try {
            if (Files.exists(Paths.get("../../uploads"))) {
                Path rootUploads = Paths.get("../../uploads/images/comprobantes");
                Files.createDirectories(rootUploads);
                Files.copy(destino, rootUploads.resolve(nombreArchivo), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (Exception ignored) {
        }

        try {
            Path staticDir = Paths.get("src/main/resources/static/images/comprobantes");
            Files.createDirectories(staticDir);
            Files.copy(destino, staticDir.resolve(nombreArchivo), StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception ignored) {
        }

        return nombreArchivo;
    }

    @PostMapping("/crear")
    @Transactional
    public ResponseEntity<?> crearPedido(
            @RequestParam("id_usuario") Long idUsuario,
            @RequestParam("total_pagado") BigDecimal totalPagado,
            @RequestParam(value = "codigo_cupon", defaultValue = "") String codigoCupon,
            @RequestParam(value = "tipo_consumo", defaultValue = "para_llevar") String tipoConsumo,
            @RequestParam(value = "tipo_comprobante", defaultValue = "boleta") String tipoComprobante,
            @RequestParam(value = "dni_opcional", defaultValue = "") String dniOpcional,
            @RequestParam(value = "telefono_cliente", defaultValue = "") String telefonoCliente,
            @RequestParam(value = "notas_cliente", defaultValue = "") String notasCliente,
            @RequestParam("carrito") String carritoJson,
            @RequestParam("comprobante") MultipartFile archivoComprobante
    ) {
        try {
            Usuario usuario = usuarioRepository.findById(idUsuario)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            if (telefonoCliente != null && !telefonoCliente.isBlank()) {
                usuario.setTelefono(telefonoCliente.trim());
            }
            if (dniOpcional != null && !dniOpcional.isBlank() && (usuario.getDni() == null || usuario.getDni().isBlank())) {
                usuario.setDni(dniOpcional.trim());
            }

            String nombreArchivo = guardarComprobante(archivoComprobante, idUsuario);

            if (codigoCupon != null && !codigoCupon.trim().isEmpty()) {
                cuponRepository.findByCodigoIgnoreCase(codigoCupon.trim()).ifPresent(cupon -> {
                    int usos = cupon.getUsosActuales() != null ? cupon.getUsosActuales() : 0;
                    cupon.setUsosActuales(usos + 1);
                    cuponRepository.save(cupon);
                });
            }

            Pedido nuevoPedido = new Pedido();
            nuevoPedido.setUsuario(usuario);
            nuevoPedido.setTotalPagado(totalPagado);
            nuevoPedido.setCodigoCupon(codigoCupon != null ? codigoCupon.trim() : "");
            nuevoPedido.setTipoConsumo(tipoConsumo);
            nuevoPedido.setTipoComprobante(tipoComprobante);
            nuevoPedido.setDniOpcional(dniOpcional != null && !dniOpcional.isBlank() ? dniOpcional.trim() : usuario.getDni());
            nuevoPedido.setNotasCliente(notasCliente);
            nuevoPedido.setComprobantePago(nombreArchivo);
            nuevoPedido.setRecompensaProcesada(false);

            nuevoPedido = pedidoRepository.save(nuevoPedido);

            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Object>> carrito = mapper.readValue(carritoJson, new TypeReference<List<Map<String, Object>>>() {});

            int totalUnidadesCompradas = 0;

            for (Map<String, Object> item : carrito) {
                Object idProdObj = item.get("id_producto") != null ? item.get("id_producto") : item.get("id_cactus");
                Long idProducto = Long.valueOf(idProdObj.toString());
                Producto producto = productoRepository.findById(idProducto)
                        .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + idProducto));
                Integer cantidad = Integer.valueOf(item.get("cantidad").toString());
                String estilo = item.getOrDefault("estilo", "Estándar").toString();
                Object precioObj = item.get("precio") != null ? item.get("precio") : item.get("precio_base");
                BigDecimal precioUnit = precioObj != null ? new BigDecimal(precioObj.toString()) : producto.getPrecio();

                // Descontar stock inteligente (variante + producto general)
                descontarStockProducto(producto, estilo, cantidad);

                DetallePedido detalle = new DetallePedido();
                detalle.setPedido(nuevoPedido);
                detalle.setProducto(producto);
                detalle.setCantidad(cantidad);
                detalle.setPrecioUnitario(precioUnit);
                detalle.setEstiloSeleccionado(estilo);

                detallePedidoRepository.save(detalle);
                totalUnidadesCompradas += cantidad;
            }

            // Actualizar contador de productos comprados del usuario
            int compradosPrevios = usuario.getProductosComprados() != null ? usuario.getProductosComprados() : 0;
            usuario.setProductosComprados(compradosPrevios + totalUnidadesCompradas);
            usuarioRepository.save(usuario);

            String mensajeFidelidad = "¡Gracias por tu compra!";
            Map<String, Object> premioLealtad = null;

            List<Pedido> comprasSinPremio = pedidoRepository.findByUsuarioIdUsuarioOrderByFechaPedidoDesc(idUsuario).stream()
                    .filter(p -> !Boolean.TRUE.equals(p.getRecompensaProcesada()) && !"cancelado".equalsIgnoreCase(p.getEstado()))
                    .toList();

            if (comprasSinPremio.size() >= 4) {
                String codigoGenerado = "MOKA-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();
                Cupon nuevoCupon = new Cupon();
                nuevoCupon.setCodigo(codigoGenerado);
                nuevoCupon.setDescuentoPorcentaje(25);
                nuevoCupon.setUsuario(usuario);
                nuevoCupon.setLimiteUsos(1);
                nuevoCupon.setFechaVencimiento(LocalDateTime.now().plusMonths(2));
                cuponRepository.save(nuevoCupon);

                for (int i = 0; i < 4; i++) {
                    Pedido p = comprasSinPremio.get(i);
                    p.setRecompensaProcesada(true);
                    pedidoRepository.save(p);
                }

                premioLealtad = Map.of("codigo", codigoGenerado, "descuento", 25);
                mensajeFidelidad = "¡Felicidades! Has completado 4 compras y ganaste un cupón de 25% de descuento.";
            } else {
                int faltantes = 4 - comprasSinPremio.size();
                mensajeFidelidad = "¡Vas por buen camino! Te faltan solo " + faltantes + " compra(s) para tu próximo premio de fidelidad.";
            }

            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("success", true);
            respuesta.put("id_pedido", nuevoPedido.getIdPedido());
            respuesta.put("id_reserva", nuevoPedido.getIdPedido());
            respuesta.put("codigo_ticket", nuevoPedido.getCodigoTicket());
            respuesta.put("mensaje_fidelidad", mensajeFidelidad);
            if (premioLealtad != null) respuesta.put("premio_lealtad", premioLealtad);

            return ResponseEntity.ok(respuesta);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al procesar la compra: " + e.getMessage()));
        }
    }

    private void descontarStockProducto(Producto producto, String estilo, int cantidad) {
        if (producto.getVariantes() != null && !producto.getVariantes().isEmpty()) {
            boolean descontado = false;
            for (ProductoVariante pv : producto.getVariantes()) {
                if (pv.getNombreVariante() != null && pv.getNombreVariante().equalsIgnoreCase(estilo)) {
                    int st = pv.getStock() != null ? pv.getStock() : 0;
                    pv.setStock(Math.max(0, st - cantidad));
                    descontado = true;
                    break;
                }
            }
            if (!descontado) {
                ProductoVariante pv = producto.getVariantes().get(0);
                int st = pv.getStock() != null ? pv.getStock() : 0;
                pv.setStock(Math.max(0, st - cantidad));
            }
        }
        int stockActual = producto.getStock() != null ? producto.getStock() : 0;
        producto.setStock(Math.max(0, stockActual - cantidad));
        productoRepository.save(producto);
    }
}
