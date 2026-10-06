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
/* =========================================================================================
   [PRODUCCIÓN - DOMINIO] 
   Cuando tengas tu dominio, cambia los orígenes para que solo tu web pueda consultar esta API.
   Ejemplo: @CrossOrigin(origins = {"http://localhost:4200", "https://www.cafeayacuchano.com"})
   ========================================================================================= */
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
public class ProductoController {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;

    public ProductoController(ProductoRepository productoRepository, CategoriaRepository categoriaRepository) {
        this.productoRepository = productoRepository;
        this.categoriaRepository = categoriaRepository;
    }

    @GetMapping("/productos")
    public ResponseEntity<List<Producto>> obtenerProductos() {
        return ResponseEntity.ok(productoRepository.findAll());
    }

    @PostMapping("/productos/guardar")
    public ResponseEntity<?> guardarProducto(@RequestBody Producto producto) {
        try {
            productoRepository.save(producto);
            return ResponseEntity.ok(Map.of("success", true, "mensaje", "Producto guardado exitosamente."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "Error al guardar el producto."));
        }
    }

    @DeleteMapping("/productos/eliminar/{id}")
    public ResponseEntity<?> eliminarProducto(@PathVariable Long id) {
        productoRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Producto y sus variantes eliminados."));
    }

    @PostMapping("/categorias/guardar")
    public ResponseEntity<?> guardarCategoria(@RequestBody Categoria categoria) {
        categoriaRepository.save(categoria);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Categoría guardada con éxito."));
    }

    @DeleteMapping("/categorias/eliminar/{id}")
    public ResponseEntity<?> eliminarCategoria(@PathVariable Long id) {
        
        // Validación de integridad para evitar romper el catálogo
        boolean enUso = productoRepository.findAll().stream()
                .anyMatch(p -> p.getCategoria() != null && ((Categoria) p.getCategoria()).getIdCategoria().equals(id));

        if (enUso) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "mensaje", "No se puede eliminar. Hay productos usando esta categoría."));
        }

        categoriaRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "mensaje", "Categoría eliminada."));
    }
}