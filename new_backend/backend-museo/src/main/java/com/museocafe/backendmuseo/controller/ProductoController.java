package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Categoria;
import com.museocafe.backendmuseo.model.ImagenProducto;
import com.museocafe.backendmuseo.model.Producto;
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

    // Definimos dónde se guardarán las fotos físicamente
    private final String UPLOADS_DIR = "uploads/images/";

    public ProductoController(ProductoRepository productoRepository, CategoriaRepository categoriaRepository) {
        this.productoRepository = productoRepository;
        this.categoriaRepository = categoriaRepository;
    }

    // --- MÉTODO AUXILIAR PARA GUARDAR ARCHIVOS EN EL DISCO ---
    private String guardarArchivo(MultipartFile archivo, String subcarpeta) throws Exception {
        if (archivo == null || archivo.isEmpty()) return null;
        
        // Limpiamos el nombre original y le añadimos un código único para que no se sobreescriban
        String nombreOriginal = archivo.getOriginalFilename().replace(" ", "_");
        String nombreFinal = UUID.randomUUID().toString().substring(0,8) + "_" + nombreOriginal;
        
        Path rutaDirectorio = Paths.get(UPLOADS_DIR + subcarpeta);
        Files.createDirectories(rutaDirectorio); // Crea la carpeta si no existe (ej: uploads/images/cactus)
        
        Files.copy(archivo.getInputStream(), rutaDirectorio.resolve(nombreFinal), StandardCopyOption.REPLACE_EXISTING);
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

    // --- NUEVO ENDPOINT PARA RECIBIR FORM DATA CON FOTOS ---
    @PostMapping("/productos/guardar")
    public ResponseEntity<?> guardarProducto(
            @RequestParam(value = "id_producto", required = false) Long idProducto,
            @RequestParam("nombre_comun") String nombreComun,
            @RequestParam(value = "nombre_cientifico", required = false) String nombreCientifico,
            @RequestParam(value = "id_categoria", required = false) Long idCategoria,
            @RequestParam("precio") BigDecimal precio,
            @RequestParam("cuidados") String cuidados,
            @RequestParam("detalles_tecnicos") String detallesTecnicos,
            @RequestParam(value = "stock", required = false) Integer stock,
            @RequestParam("tipo_producto") String tipoProducto,
            @RequestParam(value = "activo", required = false) Boolean activo,
            @RequestParam(value = "variantes_json", required = false) String variantesJson,
            @RequestParam(value = "foto_principal", required = false) MultipartFile fotoPrincipal,
            @RequestParam(value = "fotos_adicionales[]", required = false) MultipartFile[] fotosAdicionales
    ) {
        try {
            // 1. Buscamos el producto para editar, o creamos uno nuevo
            Producto producto = (idProducto != null) ? 
                productoRepository.findById(idProducto).orElse(new Producto()) : new Producto();

            // 2. Asignamos los textos
            producto.setNombre(nombreComun);
            producto.setSubtitulo(nombreCientifico);
            producto.setPrecio(precio);
            producto.setCuidados(cuidados);
            producto.setDetallesTecnicos(detallesTecnicos);
            producto.setStock(stock != null ? stock : 0);
            producto.setTipoProducto(tipoProducto);
            // Si añadiste este campo a Producto.java para los estilos de recuerdos:
            // producto.setVariantesJson(variantesJson); 

            if (activo != null) {
                producto.setActivo(activo);
            } else {
                producto.setActivo(true);
            }

            if (idCategoria != null) {
                Categoria cat = categoriaRepository.findById(idCategoria).orElse(null);
                producto.setCategoria(cat);
            }

            // 3. Procesamos y guardamos la Foto Principal
            if (fotoPrincipal != null && !fotoPrincipal.isEmpty()) {
                producto.getImagenes().removeIf(img -> img.getEsPrincipal() != null && img.getEsPrincipal());
                String nombreFoto = guardarArchivo(fotoPrincipal, tipoProducto);
                ImagenProducto img = new ImagenProducto();
                img.setRutaImagen(nombreFoto);
                img.setEsPrincipal(true);
                producto.addImagen(img); // Se vincula usando el método de Producto.java
            }

            // 4. Procesamos y guardamos TODAS las fotos adicionales
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

            // 5. Guardamos todo en PostgreSQL
            productoRepository.save(producto);
            
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Producto guardado con sus imágenes."));
        } catch (Exception e) {
            e.printStackTrace(); // Esto imprimirá en tu terminal exactamente en qué línea falló si hay un error
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al guardar el producto: " + e.getMessage()));
        }
    }

    @DeleteMapping("/productos/eliminar/{id}")
    public ResponseEntity<?> eliminarProducto(@PathVariable Long id) {
        productoRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Producto eliminado."));
    }

    @PostMapping("/categorias/guardar")
    public ResponseEntity<?> guardarCategoria(@RequestBody Categoria categoria) {
        categoriaRepository.save(categoria);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Categoría guardada con éxito."));
    }

    @DeleteMapping("/categorias/eliminar/{id}")
    public ResponseEntity<?> eliminarCategoria(@PathVariable Long id) {
        boolean enUso = productoRepository.findAll().stream()
                .anyMatch(p -> p.getCategoria() != null && ((Categoria) p.getCategoria()).getIdCategoria().equals(id));
        if (enUso) return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Hay productos usando esta categoría."));
        
        categoriaRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Categoría eliminada."));
    }

    @DeleteMapping("/productos/{idProducto}/imagen/{idImagen}")
    public ResponseEntity<?> eliminarImagenProducto(@PathVariable Long idProducto, @PathVariable Long idImagen) {
        try {
            Producto producto = productoRepository.findById(idProducto).orElse(null);
            if (producto == null) return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Producto no encontrado"));
            
            // Si tu clase ImagenProducto usa otro nombre para el ID, cámbialo aquí (ej: getId())
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