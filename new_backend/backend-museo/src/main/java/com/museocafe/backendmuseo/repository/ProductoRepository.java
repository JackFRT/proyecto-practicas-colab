package com.museocafe.backendmuseo.repository;

import com.museocafe.backendmuseo.model.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {
    List<Producto> findByActivoTrue();
    List<Producto> findByTipoAndActivoTrue(String tipo);
}