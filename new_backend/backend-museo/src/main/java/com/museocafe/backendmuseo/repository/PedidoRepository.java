package com.museocafe.backendmuseo.repository;

import com.museocafe.backendmuseo.model.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    
    
    Optional<Pedido> findByCodigoTicket(String codigoTicket);
    
    
    List<Pedido> findByEstadoInOrderByFechaPedidoAsc(List<String> estados);
    
    
    List<Pedido> findByEmpleadoAtencionIdUsuarioAndEstadoOrderByFechaPedidoDesc(Long idEmpleado, String estado);

    
    List<Pedido> findByUsuarioIdUsuarioOrderByFechaPedidoDesc(Long idUsuario);

    
    List<Pedido> findByEstado(String estado);
}