package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.repository.CategoriaRepository;
import com.museocafe.backendmuseo.repository.NoticiaRepository;
import com.museocafe.backendmuseo.repository.ProductoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/publico")
@CrossOrigin(origins = "*")
public class HomeController {

    private final CategoriaRepository categoriaRepository;
    private final NoticiaRepository noticiaRepository;
    private final ProductoRepository productoRepository;

    public HomeController(CategoriaRepository categoriaRepository, NoticiaRepository noticiaRepository, ProductoRepository productoRepository) {
        this.categoriaRepository = categoriaRepository;
        this.noticiaRepository = noticiaRepository;
        this.productoRepository = productoRepository;
    }

    @GetMapping("/inicio")
    public ResponseEntity<?> obtenerDatosInicio() {
        Map<String, Object> respuesta = new HashMap<>();
        
        respuesta.put("success", true);
        
        // 1. Categorías
        respuesta.put("categorias", categoriaRepository.findAll());
        
        // 2. Noticias (Solo las activas/públicas)
        respuesta.put("noticias", noticiaRepository.findByEstado(true));

        // 3. Productos divididos por tipo (Ignoramos los inactivos)
        var todosLosProductos = productoRepository.findByActivoTrue();
        
        var cactus = todosLosProductos.stream()
                .filter(p -> "cactus".equalsIgnoreCase(p.getTipo()))
                .collect(Collectors.toList());
                
        var souvenirs = todosLosProductos.stream()
                .filter(p -> "recuerdo".equalsIgnoreCase(p.getTipo()))
                .collect(Collectors.toList());

        respuesta.put("cactus", cactus);
        respuesta.put("souvenirs", souvenirs);

        return ResponseEntity.ok(respuesta);
    }
}