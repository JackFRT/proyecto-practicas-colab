package com.museocafe.backendmuseo.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.museocafe.backendmuseo.model.Categoria;
import com.museocafe.backendmuseo.model.ImagenProducto;
import com.museocafe.backendmuseo.model.Producto;
import com.museocafe.backendmuseo.model.ProductoVariante;
import com.museocafe.backendmuseo.repository.CategoriaRepository;
import com.museocafe.backendmuseo.repository.ProductoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventario")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class ProductoController {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final String UPLOADS_DIR = "uploads/images/";

    public ProductoController(ProductoRepository productoRepository, CategoriaRepository categoriaRepository) {
        this.productoRepository = productoRepository;
        this.categoriaRepository = categoriaRepository;
    }

    private String guardarArchivo(MultipartFile archivo, String subcarpeta) throws Exception {
        if (archivo == null || archivo.isEmpty()) return null;

        String original = archivo.getOriginalFilename() != null ? archivo.getOriginalFilename() : "img.jpg";
        String nombreOriginal = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        String nombreFinal = UUID.randomUUID().toString().substring(0, 8) + "_" + nombreOriginal;

        Path rutaDirectorio = Paths.get(UPLOADS_DIR + subcarpeta);
        Files.createDirectories(rutaDirectorio);
        Path destino = rutaDirectorio.resolve(nombreFinal);
        Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);

        // Si existe carpeta ../../uploads/images en la raíz del proyecto, sincronizar copia
        try {
            Path rootUploads = Paths.get("../../uploads/images/" + subcarpeta);
            if (Files.exists(Paths.get("../../uploads"))) {
                Files.createDirectories(rootUploads);
                Files.copy(destino, rootUploads.resolve(nombreFinal), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (Exception ignored) {
        }

        return nombreFinal;
    }

    @GetMapping("/productos")
    public ResponseEntity<List<Producto>> obtenerProductos() {
        return ResponseEntity.ok(productoRepository.findAll());
    }

    @GetMapping("/categorias")
    public ResponseEntity<List<Categoria>> obtenerCategorias() {
        return ResponseEntity.ok(categoriaRepository.findAll());
    }

    @PostMapping("/productos/guardar")
    public ResponseEntity<?> guardarProducto(
            @RequestParam(value = "id_producto", required = false) Long idProducto,
            @RequestParam("nombre_comun") String nombreComun,
            @RequestParam(value = "nombre_cientifico", required = false) String nombreCientifico,
            @RequestParam(value = "id_categoria", required = false) Long idCategoria,
            @RequestParam(value = "precio", required = false) BigDecimal precio,
            @RequestParam(value = "precio_base", required = false) BigDecimal precioBase,
            @RequestParam(value = "cuidados", required = false, defaultValue = "") String cuidados,
            @RequestParam(value = "detalles_tecnicos", required = false, defaultValue = "") String detallesTecnicos,
            @RequestParam(value = "stock", required = false) Integer stock,
            @RequestParam(value = "tipo_producto", required = false, defaultValue = "cactus") String tipoProducto,
            @RequestParam(value = "activo", required = false) Boolean activo,
            @RequestParam(value = "contiene_alcohol", required = false) Boolean contieneAlcohol,
            @RequestParam(value = "variantes_json", required = false) String variantesJson,
            @RequestParam(value = "foto_principal", required = false) MultipartFile fotoPrincipal,
            @RequestParam(value = "fotos_adicionales[]", required = false) MultipartFile[] fotosAdicionales,
            @RequestParam(value = "fotos_variantes[]", required = false) MultipartFile[] fotosVariantes
    ) {
        try {
            Producto producto = (idProducto != null)
                    ? productoRepository.findById(idProducto).orElse(new Producto())
                    : new Producto();

            producto.setNombre(nombreComun);
            producto.setSubtitulo(nombreCientifico != null ? nombreCientifico : "");
            BigDecimal precioFinal = precio != null ? precio : (precioBase != null ? precioBase : BigDecimal.ZERO);
            producto.setPrecio(precioFinal);
            producto.setCuidados(cuidados);
            producto.setDetallesTecnicos(detallesTecnicos);
            producto.setTipoProducto(tipoProducto);
            boolean esActivo = activo != null ? activo : true;
            producto.setActivo(esActivo);
            producto.setContieneAlcohol(Boolean.TRUE.equals(contieneAlcohol));

            if (idCategoria != null) {
                Categoria cat = categoriaRepository.findById(idCategoria).orElse(null);
                producto.setCategoria(cat);
            } else {
                producto.setCategoria(null);
            }

            // Procesar Foto Principal
            if (fotoPrincipal != null && !fotoPrincipal.isEmpty()) {
                producto.getImagenes().removeIf(img -> Boolean.TRUE.equals(img.getEsPrincipal()));
                String nombreFoto = guardarArchivo(fotoPrincipal, tipoProducto);
                ImagenProducto img = new ImagenProducto();
                img.setRutaImagen(nombreFoto);
                img.setEsPrincipal(true);
                producto.addImagen(img);
            }

            // Procesar Fotos Adicionales
            if (fotosAdicionales != null) {
                for (MultipartFile fotoAdicional : fotosAdicionales) {
                    if (fotoAdicional != null && !fotoAdicional.isEmpty()) {
                        String nombreFoto = guardarArchivo(fotoAdicional, tipoProducto);
                        ImagenProducto img = new ImagenProducto();
                        img.setRutaImagen(nombreFoto);
                        img.setEsPrincipal(false);
                        producto.addImagen(img);
                    }
                }
            }

            // Procesar Variantes (producto_variantes)
            int stockCalculado = (stock != null) ? stock : 0;
            if ("cafe".equalsIgnoreCase(tipoProducto)) {
                stockCalculado = esActivo ? ((stock != null && stock > 0) ? stock : 100) : 0;
            }
            if (variantesJson != null && !variantesJson.trim().isEmpty()) {
                List<Map<String, Object>> listaVar = objectMapper.readValue(
                        variantesJson, new TypeReference<List<Map<String, Object>>>() {}
                );
                producto.getVariantes().clear();
                int sumaStock = 0;
                for (int i = 0; i < listaVar.size(); i++) {
                    Map<String, Object> vMap = listaVar.get(i);
                    String nomVar = vMap.get("nombre_variante") != null
                            ? vMap.get("nombre_variante").toString().trim()
                            : "Estándar";
                    if (nomVar.isEmpty()) nomVar = "Estándar";

                    int stVar = 0;
                    if (vMap.get("stock") != null) {
                        try {
                            stVar = Integer.parseInt(vMap.get("stock").toString());
                        } catch (NumberFormatException ignored) {
                        }
                    }
                    sumaStock += stVar;

                    String rutaImgVar = vMap.get("ruta_imagen") != null
                            ? vMap.get("ruta_imagen").toString()
                            : null;

                    if (fotosVariantes != null && i < fotosVariantes.length
                            && fotosVariantes[i] != null && !fotosVariantes[i].isEmpty()) {
                        rutaImgVar = guardarArchivo(fotosVariantes[i], "var");
                    }

                    ProductoVariante pv = new ProductoVariante();
                    pv.setNombreVariante(nomVar);
                    pv.setStock(stVar);
                    pv.setRutaImagen(rutaImgVar);
                    pv.setPrecioAdicional(BigDecimal.ZERO);
                    producto.addVariante(pv);
                }
                if (!listaVar.isEmpty()) {
                    stockCalculado = sumaStock;
                }
            } else {
                // Asegurar variante Estándar sincronizada con el stock
                if (producto.getVariantes().isEmpty()) {
                    ProductoVariante pv = new ProductoVariante();
                    pv.setNombreVariante("Estándar");
                    pv.setStock(stockCalculado);
                    pv.setPrecioAdicional(BigDecimal.ZERO);
                    producto.addVariante(pv);
                } else if (producto.getVariantes().size() == 1) {
                    producto.getVariantes().get(0).setStock(stockCalculado);
                }
            }

            producto.setStock(stockCalculado);
            productoRepository.save(producto);

            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Producto guardado con éxito."));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al guardar el producto: " + e.getMessage()));
        }
    }

    @DeleteMapping("/productos/eliminar/{id}")
    public ResponseEntity<?> eliminarProducto(@PathVariable Long id) {
        try {
            productoRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Producto eliminado."));
        } catch (Exception e) {
            // Si tiene pedidos asociados en reserva_detalles, desactivar en lugar de fallar por FK
            Producto prod = productoRepository.findById(id).orElse(null);
            if (prod != null) {
                prod.setActivo(false);
                prod.setStock(0);
                productoRepository.save(prod);
                return ResponseEntity.ok(Map.of("success", true, "mensaje", "Producto archivado (tiene historial de ventas)."));
            }
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "No se pudo eliminar el producto."));
        }
    }

    @PostMapping("/categorias/guardar")
    public ResponseEntity<?> guardarCategoria(@RequestBody Categoria categoria) {
        categoriaRepository.save(categoria);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Categoría guardada con éxito."));
    }

    @DeleteMapping("/categorias/eliminar/{id}")
    public ResponseEntity<?> eliminarCategoria(@PathVariable Long id) {
        boolean enUso = productoRepository.findAll().stream()
                .anyMatch(p -> p.getCategoria() != null && p.getCategoria().getIdCategoria().equals(id));
        if (enUso) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Hay productos usando esta categoría."));
        }

        categoriaRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Categoría eliminada."));
    }

    @DeleteMapping("/productos/{idProducto}/imagen/{idImagen}")
    public ResponseEntity<?> eliminarImagenProducto(@PathVariable Long idProducto, @PathVariable Long idImagen) {
        try {
            Producto producto = productoRepository.findById(idProducto).orElse(null);
            if (producto == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Producto no encontrado"));
            }

            boolean eliminada = producto.getImagenes().removeIf(img -> img.getIdImagen().equals(idImagen));

            if (eliminada) {
                productoRepository.save(producto);
                return ResponseEntity.ok(Map.of("success", true, "mensaje", "Imagen eliminada con éxito"));
            } else {
                return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "No se encontró la imagen"));
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "mensaje", "Error: " + e.getMessage()));
        }
    }
}
