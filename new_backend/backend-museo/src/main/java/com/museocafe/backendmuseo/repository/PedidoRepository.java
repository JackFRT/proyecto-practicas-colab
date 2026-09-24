package com.museocafe.backendmuseo.repository;

import com.museocafe.backendmuseo.model.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    
    // Para buscar un ticket específico (cuando el cliente pide su comprobante simple)
    Optional<Pedido> findByCodigoTicket(String codigoTicket);
    
    // Para el panel del empleado: trae los pedidos que aún no se entregan
    List<Pedido> findByEstadoInOrderByFechaPedidoAsc(List<String> estados);
    
    // Para las estadísticas e historial del empleado (solo los que él despachó)
    List<Pedido> findByEmpleadoAtencionIdUsuarioAndEstadoOrderByFechaPedidoDesc(Long idEmpleado, String estado);

    // Apaga el primer error del PerfilController (trae el historial del cliente)
    List<Pedido> findByUsuarioIdUsuarioOrderByFechaPedidoDesc(Long idUsuario);

    // Para que el administrador vea las ventas completadas
    List<Pedido> findByEstado(String estado);
}