package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.repository.CategoriaRepository;
import com.museocafe.backendmuseo.repository.NoticiaRepository;
import com.museocafe.backendmuseo.repository.ProductoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/publico")
/* =========================================================================================
   [PRODUCCIÓN - DOMINIO] 
   Cuando tengas tu dominio, cambia los orígenes para que solo tu web pueda consultar esta API.
   Ejemplo: @CrossOrigin(origins = {"http://localhost:4200", "https://www.cafeayacuchano.com"})
   ========================================================================================= */
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:80"})
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
        
        respuesta.put("categorias", categoriaRepository.findAll());
        
        respuesta.put("noticias", noticiaRepository.findByEstado(true));

        var todosLosProductos = productoRepository.findByActivoTrue();
        
        var cafeteria = todosLosProductos.stream()
                .filter(p -> "cafeteria".equalsIgnoreCase(p.getTipo()))
                .collect(Collectors.toList());

        var cactus = todosLosProductos.stream()
                .filter(p -> "cactus".equalsIgnoreCase(p.getTipo()))
                .collect(Collectors.toList());
                
        var souvenirs = todosLosProductos.stream()
                .filter(p -> "recuerdo".equalsIgnoreCase(p.getTipo()))
                .collect(Collectors.toList());

        respuesta.put("cafeteria", cafeteria);
        respuesta.put("cactus", cactus);
        respuesta.put("souvenirs", souvenirs);

        return ResponseEntity.ok(respuesta);
    }
}