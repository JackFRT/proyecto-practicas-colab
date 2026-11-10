package com.museocafe.backendmuseo.repository;

import com.museocafe.backendmuseo.model.ProductoVariante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductoVarianteRepository extends JpaRepository<ProductoVariante, Long> {
    List<ProductoVariante> findByProductoIdProducto(Long idProducto);
}
