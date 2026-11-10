package com.museocafe.backendmuseo.controller;

import com.museocafe.backendmuseo.model.Noticia;
import com.museocafe.backendmuseo.repository.CategoriaRepository;
import com.museocafe.backendmuseo.repository.NoticiaRepository;
import com.museocafe.backendmuseo.repository.ProductoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/publico")
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

        var noticias = noticiaRepository.findByEstado(true).stream()
                .sorted(Comparator.comparing((Noticia n) -> n.getPrioridad() != null ? n.getPrioridad() : 99))
                .collect(Collectors.toList());
        respuesta.put("noticias", noticias);

        var todosLosProductos = productoRepository.findAll().stream()
                .filter(p -> !Boolean.FALSE.equals(p.getActivo()))
                .collect(Collectors.toList());

        var cafeteria = todosLosProductos.stream()
                .filter(p -> {
                    String t = p.getTipoProducto() != null ? p.getTipoProducto().trim().toLowerCase() : "";
                    return t.equals("cafe") || t.equals("café") || t.equals("cafeteria") || t.equals("cafetería");
                })
                .collect(Collectors.toList());

        var cactus = todosLosProductos.stream()
                .filter(p -> "cactus".equalsIgnoreCase(p.getTipoProducto()))
                .collect(Collectors.toList());

        var souvenirs = todosLosProductos.stream()
                .filter(p -> "recuerdo".equalsIgnoreCase(p.getTipoProducto())
                        || "ropa".equalsIgnoreCase(p.getTipoProducto())
                        || "otro".equalsIgnoreCase(p.getTipoProducto()))
                .collect(Collectors.toList());

        respuesta.put("cafeteria", cafeteria);
        respuesta.put("cafe", cafeteria);
        respuesta.put("cactus", cactus);
        respuesta.put("souvenirs", souvenirs);
        respuesta.put("recuerdos", souvenirs);

        return ResponseEntity.ok(respuesta);
    }
}
