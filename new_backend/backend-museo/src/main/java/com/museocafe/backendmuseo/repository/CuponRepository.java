package com.museocafe.backendmuseo.repository;

import com.museocafe.backendmuseo.model.Cupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CuponRepository extends JpaRepository<Cupon, Long> {
    // Apaga el segundo error de tu PerfilController
    List<Cupon> findByUsuarioIdUsuario(Long idUsuario);
}