package com.museocafe.backendmuseo.repository;

import com.museocafe.backendmuseo.model.DetallePedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DetallePedidoRepository extends JpaRepository<DetallePedido, Long> {
    
    // Para cargar los productos exactos (el café o los cactus) que tiene una orden
    List<DetallePedido> findByPedidoIdPedido(Long idPedido);
}