package com.museocafe.backendmuseo.repository;

import com.museocafe.backendmuseo.model.Cupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CuponRepository extends JpaRepository<Cupon, Long> {

    List<Cupon> findByUsuarioIdUsuario(Long idUsuario);

    Optional<Cupon> findByCodigoIgnoreCase(String codigo);
}
