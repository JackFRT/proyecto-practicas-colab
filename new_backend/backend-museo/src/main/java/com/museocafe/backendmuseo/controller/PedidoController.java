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

    private String censurarNumero(String valor) {
        if (valor == null) return "";
        String limpio = valor.replaceAll("(?i)cel/wsp:?", "").trim();
        if (limpio.isEmpty() || "sin notas".equalsIgnoreCase(limpio) || "no especificado".equalsIgnoreCase(limpio)) {
            return "";
        }
        if (limpio.length() <= 3) {
            return "••••" + limpio;
        }
        return "••••••" + limpio.substring(limpio.length() - 3);
    }

    private String censurarCorreo(String email) {
        if (email == null || !email.contains("@")) return "";
        String[] partes = email.trim().split("@", 2);
        String user = partes[0];
        String dom = partes[1];
        String pref = user.length() <= 2 ? user.substring(0, 1) : user.substring(0, 2);
        return pref + "••••@" + dom;
    }

    private boolean usuarioYaUsoCupon(Long idUsuario, String codigoCupon) {
        if (idUsuario == null || codigoCupon == null || codigoCupon.trim().isEmpty()) {
            return false;
        }
        String codLimpio = codigoCupon.trim();
        List<Pedido> pedidosUsuario = pedidoRepository.findByUsuarioIdUsuarioOrderByFechaPedidoDesc(idUsuario);
        return pedidosUsuario.stream()
                .filter(ped -> ped.getEstado() == null || !"cancelado".equalsIgnoreCase(ped.getEstado()))
                .anyMatch(ped -> ped.getCodigoCupon() != null && ped.getCodigoCupon().trim().equalsIgnoreCase(codLimpio));
    }

    @GetMapping(value = {"/ticket/{idOrCodigo}", "/comprobante/{idOrCodigo}"}, produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> generarComprobanteHtml(@PathVariable String idOrCodigo) {
        Optional<Pedido> pedidoOpt = buscarPedidoPorIdOCodigo(idOrCodigo);
        if (pedidoOpt.isEmpty()) {
            return ResponseEntity.status(404).body("<html><body style='font-family:sans-serif;text-align:center;padding:40px;'><h2>Ticket no encontrado</h2></body></html>");
        }

        Pedido p = pedidoOpt.get();
        List<DetallePedido> detalles = detallePedidoRepository.findByPedidoIdPedido(p.getIdPedido());

        String numOrden = String.valueOf(p.getIdPedido());
        String fecha = p.getFechaPedido() != null
                ? p.getFechaPedido().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                : LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String clienteNombre = p.getUsuario() != null ? p.getUsuario().getNombre() : "Cliente";

        String rawDni = p.getDniOpcionalSnake();
        String dniCensurado = censurarNumero(rawDni);

        String rawTel = p.getTelefonoClienteSnake();
        String telCensurado = censurarNumero(rawTel);

        StringBuilder datosClienteHtml = new StringBuilder();
        datosClienteHtml.append("<div class='row'><span>Cliente:</span><strong>").append(clienteNombre).append("</strong></div>");
        if (!dniCensurado.isEmpty()) {
            datosClienteHtml.append("<div class='row'><span>DNI (Protegido):</span><strong>").append(dniCensurado).append("</strong></div>");
        }
        if (!telCensurado.isEmpty()) {
            datosClienteHtml.append("<div class='row'><span>Teléfono (Protegido):</span><strong>").append(telCensurado).append("</strong></div>");
        }
        datosClienteHtml.append("<div class='row'><span>Fecha:</span><strong>").append(fecha).append("</strong></div>");
        datosClienteHtml.append("<div class='row'><span>Estado:</span><strong class='badge'>")
                .append(p.getEstado() != null ? p.getEstado().replace("_", " ").toUpperCase() : "PENDIENTE")
                .append("</strong></div>");

        StringBuilder itemsHtml = new StringBuilder();
        BigDecimal subtotalBruto = BigDecimal.ZERO;

        for (DetallePedido d : detalles) {
            int cant = d.getCantidad() != null ? d.getCantidad() : 1;
            BigDecimal unit = d.getPrecioUnitario() != null ? d.getPrecioUnitario() : BigDecimal.ZERO;
            BigDecimal sub = unit.multiply(BigDecimal.valueOf(cant)).setScale(2, RoundingMode.HALF_UP);
            subtotalBruto = subtotalBruto.add(sub);

            String nombreProd = d.getProducto() != null ? d.getProducto().getNombre() : "Producto";
            String estilo = (d.getEstiloSeleccionado() != null && !"Estándar".equalsIgnoreCase(d.getEstiloSeleccionado()) && !"Principal".equalsIgnoreCase(d.getEstiloSeleccionado()))
                    ? " <span style='color:#7c6f64;font-size:12px;'>(" + d.getEstiloSeleccionado() + ")</span>"
                    : "";

            itemsHtml.append("<div class='item-row'>")
                    .append("<div class='item-name'><strong>").append(cant).append("x</strong> ").append(nombreProd).append(estilo).append("</div>")
                    .append("<div class='item-price'>S/ ").append(sub).append("</div>")
                    .append("</div>");
        }

        BigDecimal totalPagado = p.getTotalPagado() != null ? p.getTotalPagado().setScale(2, RoundingMode.HALF_UP) : subtotalBruto;
        BigDecimal ahorro = subtotalBruto.subtract(totalPagado);

        StringBuilder descuentoHtml = new StringBuilder();
        if (ahorro.compareTo(new BigDecimal("0.05")) > 0) {
            String cuponLabel = (p.getCodigoCupon() != null && !p.getCodigoCupon().isBlank()) ? " (" + p.getCodigoCupon() + ")" : "";
            descuentoHtml.append("<div class='row sub'><span>Subtotal:</span><span>S/ ").append(subtotalBruto.setScale(2, RoundingMode.HALF_UP)).append("</span></div>");
            descuentoHtml.append("<div class='row discount'><span>Descuento").append(cuponLabel).append(":</span><span>- S/ ").append(ahorro.setScale(2, RoundingMode.HALF_UP)).append("</span></div>");
        }

        String html = """
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>Ticket de Compra #%s - Café Ayacuchano</title>
                    <style>
                        * { box-sizing: border-box; }
                        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #efeae1; padding: 24px 14px; display: flex; justify-content: center; margin: 0; color: #2b2118; }
                        .wrapper { width: 100%%; max-width: 370px; }
                        .btn-print { display: block; width: 100%%; background: #2d4234; color: #fff; text-align: center; padding: 11px 16px; border: none; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; margin-bottom: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
                        .btn-print:hover { background: #1e2d23; }
                        .card { background: #fffdf9; padding: 24px 22px; border-radius: 20px; box-shadow: 0 12px 32px rgba(43,33,24,0.1); border: 1px solid #e2d9c8; }
                        .brand { text-align: center; padding-bottom: 16px; border-bottom: 1px dashed #d5c8b4; margin-bottom: 14px; }
                        .brand-tag { display: inline-block; background: #f2eadc; color: #6e472b; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 999px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
                        .brand h1 { margin: 0; font-size: 19px; font-weight: 900; color: #1a281f; letter-spacing: -0.3px; }
                        .brand p { margin: 4px 0 0 0; font-size: 12px; color: #6e5a49; }
                        .order-number { text-align: center; background: #2d4234; color: #fff; padding: 8px 12px; border-radius: 12px; font-weight: 800; font-size: 14px; letter-spacing: 1px; margin-bottom: 14px; }
                        .section-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #8c583a; margin-bottom: 8px; }
                        .info-box { background: #f8f4ec; padding: 12px 14px; border-radius: 12px; margin-bottom: 16px; font-size: 13px; }
                        .row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; gap: 8px; }
                        .row span { color: #6e5a49; }
                        .badge { background: #e3eed8; color: #2d4234; padding: 2px 8px; border-radius: 999px; font-size: 11px; }
                        .items-box { border-top: 1px dashed #d5c8b4; border-bottom: 1px dashed #d5c8b4; padding: 12px 0; margin-bottom: 14px; }
                        .item-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 6px 0; font-size: 13px; gap: 10px; }
                        .item-name { color: #2b2118; line-height: 1.35; }
                        .item-price { font-weight: 700; color: #1a281f; white-space: nowrap; }
                        .totals-box { font-size: 13px; margin-bottom: 16px; }
                        .row.sub { color: #6e5a49; }
                        .row.discount { color: #27ae60; font-weight: 700; }
                        .total-final { display: flex; justify-content: space-between; align-items: center; font-size: 18px; font-weight: 900; color: #1a281f; padding-top: 8px; margin-top: 6px; border-top: 2px solid #2d4234; }
                        .footer { text-align: center; font-size: 11.5px; color: #6e5a49; line-height: 1.5; background: #f8f4ec; padding: 12px; border-radius: 12px; }
                        .footer a { color: #2d4234; font-weight: 700; }
                        @media print {
                            body { background: #fff; padding: 0; }
                            .btn-print { display: none; }
                            .card { box-shadow: none; border: 1px solid #ccc; }
                        }
                    </style>
                </head>
                <body>
                    <div class="wrapper">
                        <button class="btn-print" onclick="window.print()">Imprimir / Guardar Ticket Simple</button>
                        <div class="card">
                            <div class="brand">
                                <span class="brand-tag">Ticket Simple de Compra</span>
                                <h1>CAFÉ AYACUCHANO &amp; CACTUS MUSEUM</h1>
                                <p>Jr. Asamblea 245 / Jr. San Cristóbal, Ayacucho</p>
                            </div>

                            <div class="order-number">PEDIDO #%s</div>

                            <div class="section-label">Datos del Pedido</div>
                            <div class="info-box">
                                %s
                            </div>

                            <div class="section-label">Detalle de Productos</div>
                            <div class="items-box">
                                %s
                            </div>

                            <div class="totals-box">
                                %s
                                <div class="total-final">
                                    <span>TOTAL PAGADO</span>
                                    <span>S/ %s</span>
                                </div>
                            </div>

                            <div class="footer">
                                <strong>¡Gracias por tu preferencia!</strong><br>
                                Presenta este ticket simple para recoger tu pedido en nuestro local principal
                                (<a href="https://maps.app.goo.gl/j9zGEJaTW7UxszBk9" target="_blank">Ver ubicación en Google Maps</a>).
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(
                numOrden,
                numOrden,
                datosClienteHtml.toString(),
                itemsHtml.toString(),
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

        String codUpper = cupon.getCodigo() != null ? cupon.getCodigo().trim().toUpperCase() : "";
        boolean esCuponPersonalORuleta = cupon.getUsuario() != null || codUpper.startsWith("RUL-") || codUpper.startsWith("MOKA-");

        if (esCuponPersonalORuleta) {
            // Los tickets ganados por la ruleta o premios personales están ligados estrictamente al ID del usuario que los ganó
            if (cupon.getUsuario() == null || idUsuario == null || !cupon.getUsuario().getIdUsuario().equals(idUsuario)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "mensaje", "Este cupón de ruleta es personal y solo puede ser utilizado por la cuenta que lo ganó."
                ));
            }
        } else {
            // Cupón público: cualquier usuario puede usarlo, pero máximo 1 sola vez por usuario
            if (idUsuario != null && usuarioYaUsoCupon(idUsuario, cupon.getCodigo())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "mensaje", "Ya utilizaste este cupón promocional anteriormente. Solo se permite un uso por usuario."
                ));
            }
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
            @RequestParam(value = "comprobante", required = false) MultipartFile archivoComprobante
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
                Optional<Cupon> cupOpt = cuponRepository.findByCodigoIgnoreCase(codigoCupon.trim());
                if (cupOpt.isPresent()) {
                    Cupon cupon = cupOpt.get();
                    String codUpper = cupon.getCodigo() != null ? cupon.getCodigo().trim().toUpperCase() : "";
                    boolean esPersonalORuleta = cupon.getUsuario() != null || codUpper.startsWith("RUL-") || codUpper.startsWith("MOKA-");
                    if (esPersonalORuleta) {
                        if (cupon.getUsuario() == null || !cupon.getUsuario().getIdUsuario().equals(idUsuario)) {
                            return ResponseEntity.badRequest().body(Map.of(
                                    "success", false,
                                    "mensaje", "El cupón de ruleta solo puede ser usado por la cuenta que lo ganó."
                            ));
                        }
                    } else if (usuarioYaUsoCupon(idUsuario, cupon.getCodigo())) {
                        return ResponseEntity.badRequest().body(Map.of(
                                "success", false,
                                "mensaje", "Ya utilizaste este cupón promocional anteriormente. Solo se permite un uso por usuario."
                        ));
                    }
                    int usos = cupon.getUsosActuales() != null ? cupon.getUsosActuales() : 0;
                    cupon.setUsosActuales(usos + 1);
                    cuponRepository.save(cupon);
                }
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
            boolean esAdmin = "admin".equalsIgnoreCase(usuario.getRol());

            for (Map<String, Object> item : carrito) {
                Object idProdObj = item.get("id_producto") != null ? item.get("id_producto") : item.get("id_cactus");
                Long idProducto = Long.valueOf(idProdObj.toString());
                Producto producto = productoRepository.findById(idProducto)
                        .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + idProducto));
                Integer cantidad = Integer.valueOf(item.get("cantidad").toString());
                String estilo = item.getOrDefault("estilo", "Estándar").toString();
                Object precioObj = item.get("precio") != null ? item.get("precio") : item.get("precio_base");
                BigDecimal precioUnit = precioObj != null ? new BigDecimal(precioObj.toString()) : producto.getPrecio();

                // Descontar stock inteligente solo si no es compra de prueba de administrador
                if (!esAdmin) {
                    descontarStockProducto(producto, estilo, cantidad);
                }

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
