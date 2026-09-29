package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.*;
import com.museocafe.backendmuseo.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/pedidos")
@CrossOrigin(origins = "*")
public class PedidoController {

    private final PedidoRepository pedidoRepository;
    private final DetallePedidoRepository detallePedidoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProductoRepository productoRepository;
    private final CuponRepository cuponRepository;

    public PedidoController(PedidoRepository pedidoRepository, DetallePedidoRepository detallePedidoRepository, 
                            UsuarioRepository usuarioRepository, ProductoRepository productoRepository, 
                            CuponRepository cuponRepository) {
        this.pedidoRepository = pedidoRepository;
        this.detallePedidoRepository = detallePedidoRepository;
        this.usuarioRepository = usuarioRepository;
        this.productoRepository = productoRepository;
        this.cuponRepository = cuponRepository;
    }

    
    
    
    @GetMapping("/ticket/{codigoTicket}")
    public ResponseEntity<?> obtenerTicket(@PathVariable String codigoTicket) {
        Optional<Pedido> pedidoOpt = pedidoRepository.findByCodigoTicket(codigoTicket);
        
        if (pedidoOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Ticket no encontrado"));
        }

        Pedido pedido = pedidoOpt.get();
        List<DetallePedido> detalles = detallePedidoRepository.findByPedidoIdPedido(pedido.getIdPedido());

        
        Map<String, Object> ticket = new HashMap<>();
        ticket.put("codigo", pedido.getCodigoTicket());
        ticket.put("fecha", pedido.getFechaPedido());
        ticket.put("cliente", pedido.getUsuario().getNombre());
        ticket.put("tipoConsumo", pedido.getTipoConsumo());
        ticket.put("total", pedido.getTotalPagado());
        ticket.put("estado", pedido.getEstado());
        ticket.put("items", detalles);

        return ResponseEntity.ok(ticket);
    }

    
    
    
    @PostMapping("/crear")
    @Transactional 
    public ResponseEntity<?> crearPedido(
            @RequestParam("id_usuario") Long idUsuario,
            @RequestParam("total_pagado") BigDecimal totalPagado,
            @RequestParam(value = "codigo_cupon", defaultValue = "") String codigoCupon,
            @RequestParam(value = "tipo_consumo", defaultValue = "para_llevar") String tipoConsumo,
            @RequestParam(value = "notas_cliente", defaultValue = "") String notasCliente,
            @RequestParam("carrito") String carritoJson,
            @RequestParam("comprobante") MultipartFile archivoComprobante) {
        
        try {
            Usuario usuario = usuarioRepository.findById(idUsuario)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            
            String nombreArchivo = null;
            if (archivoComprobante != null && !archivoComprobante.isEmpty()) {
                
                nombreArchivo = "yape_" + idUsuario + "_" + System.currentTimeMillis() + ".jpg";
                
                Path directorio = Paths.get("src/main/resources/static/images/comprobantes/");
                if (!Files.exists(directorio)) {
                    Files.createDirectories(directorio);
                }
                Files.copy(archivoComprobante.getInputStream(), directorio.resolve(nombreArchivo));
            }

            
            if (!codigoCupon.isEmpty()) {
                Cupon cupon = cuponRepository.findAll().stream()
                        .filter(c -> c.getCodigo().equals(codigoCupon)).findFirst().orElse(null);
                if (cupon != null) {
                    cupon.setUsosActuales(cupon.getUsosActuales() + 1);
                    cuponRepository.save(cupon);
                }
            }

            
            Pedido nuevoPedido = new Pedido();
            nuevoPedido.setUsuario(usuario);
            nuevoPedido.setTotalPagado(totalPagado);
            nuevoPedido.setCodigoCupon(codigoCupon);
            nuevoPedido.setTipoConsumo(tipoConsumo);
            nuevoPedido.setNotasCliente(notasCliente);
            nuevoPedido.setComprobantePago(nombreArchivo); 
            nuevoPedido.setRecompensaProcesada(false); 
            
            nuevoPedido = pedidoRepository.save(nuevoPedido);

            
            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Object>> carrito = mapper.readValue(carritoJson, new TypeReference<List<Map<String, Object>>>(){});

            for (Map<String, Object> item : carrito) {
                Long idProducto = Long.valueOf(item.get("id_producto").toString());
                Producto producto = productoRepository.findById(idProducto).orElseThrow();
                Integer cantidad = Integer.valueOf(item.get("cantidad").toString());
                String estilo = item.getOrDefault("estilo", "Estándar").toString();

                DetallePedido detalle = new DetallePedido();
                detalle.setPedido(nuevoPedido);
                detalle.setProducto(producto);
                detalle.setCantidad(cantidad);
                detalle.setPrecioUnitario(new BigDecimal(item.get("precio").toString()));
                detalle.setEstiloSeleccionado(estilo);
                
                detallePedidoRepository.save(detalle);
            }

            
            String mensajeFidelidad = "¡Gracias por tu compra!";
            Map<String, Object> premioLealtad = null;

            List<Pedido> comprasSinPremio = pedidoRepository.findByUsuarioIdUsuarioOrderByFechaPedidoDesc(idUsuario).stream()
                    .filter(p -> !p.getRecompensaProcesada() && !"cancelado".equals(p.getEstado()))
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
                mensajeFidelidad = "¡Felicidades! Has completado 4 compras y ganaste un premio premium.";
            } else {
                int faltantes = 4 - comprasSinPremio.size();
                mensajeFidelidad = "¡Vas por buen camino! Te faltan solo " + faltantes + " compras para tu próximo premio.";
            }

            
            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("success", true);
            respuesta.put("id_pedido", nuevoPedido.getIdPedido());
            respuesta.put("codigo_ticket", nuevoPedido.getCodigoTicket());
            respuesta.put("mensaje_fidelidad", mensajeFidelidad);
            if (premioLealtad != null) respuesta.put("premio_lealtad", premioLealtad);

            return ResponseEntity.ok(respuesta);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al procesar la compra: " + e.getMessage()));
        }
    }
}