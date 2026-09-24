package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Categoria;
import com.museocafe.backendmuseo.model.Producto;
import com.museocafe.backendmuseo.repository.CategoriaRepository;
import com.museocafe.backendmuseo.repository.ProductoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventario")
@CrossOrigin(origins = "*")
public class ProductoController {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;

    public ProductoController(ProductoRepository productoRepository, CategoriaRepository categoriaRepository) {
        this.productoRepository = productoRepository;
        this.categoriaRepository = categoriaRepository;
    }

    // 1. CATÁLOGO COMPLETO (Reemplaza obtener_catalogo.php y get_cactus.php)
    @GetMapping("/productos")
    public ResponseEntity<List<Producto>> obtenerProductos() {
        return ResponseEntity.ok(productoRepository.findAll());
    }

    // 2. GUARDAR / ACTUALIZAR PRODUCTO (Reemplaza acción guardar_producto de inventario_api.php)
    @PostMapping("/productos/guardar")
    public ResponseEntity<?> guardarProducto(@RequestBody Producto producto) {
        try {
            productoRepository.save(producto);
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Producto guardado exitosamente."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al guardar el producto."));
        }
    }

    // 3. ELIMINAR PRODUCTO (Reemplaza acción eliminar_producto de inventario_api.php)
    @DeleteMapping("/productos/eliminar/{id}")
    public ResponseEntity<?> eliminarProducto(@PathVariable Long id) {
        productoRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Producto y sus variantes eliminados."));
    }

    // 4. GUARDAR CATEGORÍA (Reemplaza acción guardar_categoria de inventario_api.php)
    @PostMapping("/categorias/guardar")
    public ResponseEntity<?> guardarCategoria(@RequestBody Categoria categoria) {
        categoriaRepository.save(categoria);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Categoría guardada con éxito."));
    }

    // 5. ELIMINAR CATEGORÍA CON VALIDACIÓN (Reemplaza acción eliminar_categoria de inventario_api.php)
    @DeleteMapping("/categorias/eliminar/{id}")
    public ResponseEntity<?> eliminarCategoria(@PathVariable Long id) {
        // Validamos si la categoría está en uso antes de borrarla
        boolean enUso = productoRepository.findAll().stream()
                .anyMatch(p -> p.getCategoria() != null && ((Categoria) p.getCategoria()).getIdCategoria().equals(id));

        if (enUso) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "No se puede eliminar. Hay productos usando esta categoría."));
        }

        categoriaRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Categoría eliminada."));
    }
}