package com.museocafe.backendmuseo.config;

import com.museocafe.backendmuseo.model.Producto;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.ProductoRepository;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class DataInitializer implements CommandLineRunner {

    private final ProductoRepository productoRepository;
    private final UsuarioRepository usuarioRepository;

    public DataInitializer(ProductoRepository productoRepository, UsuarioRepository usuarioRepository) {
        this.productoRepository = productoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public void run(String... args) {
        if (usuarioRepository.count() == 0) {
            Usuario admin = new Usuario();
            admin.setNombre("Admin Museo");
            admin.setEmail("admin@museocafe.com");
            admin.setPassword("123456");
            admin.setRol("admin");
            usuarioRepository.save(admin);
        }

        if (productoRepository.count() == 0) {
            productoRepository.save(new Producto(null, "Cactus San Pedro", "Echinopsis pachanoi", new BigDecimal("45.00"), "cactus", "Riego quincenal y luz directa", 15, true));
            productoRepository.save(new Producto(null, "Espresso Museo", "Café de Especialidad", new BigDecimal("8.50"), "cafe", "Servido caliente", 50, true));
            productoRepository.save(new Producto(null, "Llavero Cactus Artesanal", null, new BigDecimal("12.00"), "recuerdo", "Cerámica hecha a mano", 30, true));
        }
    }
}