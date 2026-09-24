package com.museocafe.backendmuseo.repository;

import com.museocafe.backendmuseo.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    Optional<Usuario> findByDni(String dni);
    boolean existsByEmail(String email);
    
    // ... tus otras búsquedas de email ...

    // Buscador en vivo de clientes para que el empleado les registre visitas o compras
    @org.springframework.data.jpa.repository.Query("SELECT u FROM Usuario u WHERE (LOWER(u.nombre) LIKE LOWER(CONCAT('%', :termino, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :termino, '%')) OR LOWER(u.dni) LIKE LOWER(CONCAT('%', :termino, '%'))) AND u.rol IN ('cliente', 'admin')")
    List<Usuario> buscarClientesParaEmpleado(@org.springframework.data.repository.query.Param("termino") String termino);
}

