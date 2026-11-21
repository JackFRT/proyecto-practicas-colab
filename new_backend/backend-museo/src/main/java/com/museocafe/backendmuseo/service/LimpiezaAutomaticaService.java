package com.museocafe.backendmuseo.service;

import com.museocafe.backendmuseo.model.Cupon;
import com.museocafe.backendmuseo.model.ImagenProducto;
import com.museocafe.backendmuseo.model.Noticia;
import com.museocafe.backendmuseo.model.Pedido;
import com.museocafe.backendmuseo.model.Producto;
import com.museocafe.backendmuseo.model.ProductoVariante;
import com.museocafe.backendmuseo.model.Usuario;
import com.museocafe.backendmuseo.repository.CuponRepository;
import com.museocafe.backendmuseo.repository.NoticiaRepository;
import com.museocafe.backendmuseo.repository.PedidoRepository;
import com.museocafe.backendmuseo.repository.ProductoRepository;
import com.museocafe.backendmuseo.repository.UsuarioRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class LimpiezaAutomaticaService {

    private final ProductoRepository productoRepository;
    private final NoticiaRepository noticiaRepository;
    private final PedidoRepository pedidoRepository;
    private final CuponRepository cuponRepository;
    private final UsuarioRepository usuarioRepository;

    private static final List<String> SUBCARPETAS_IMAGENES = Arrays.asList(
            "cactus", "cafe", "recuerdo", "var", "news", "comprobantes"
    );

    public LimpiezaAutomaticaService(
            ProductoRepository productoRepository,
            NoticiaRepository noticiaRepository,
            PedidoRepository pedidoRepository,
            CuponRepository cuponRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.productoRepository = productoRepository;
        this.noticiaRepository = noticiaRepository;
        this.pedidoRepository = pedidoRepository;
        this.cuponRepository = cuponRepository;
        this.usuarioRepository = usuarioRepository;
    }

    /**
     * Se ejecuta automáticamente cada 30 minutos (y 20 segundos después de iniciar el servidor):
     * 1. Marca como 'desatendida' las órdenes pendientes o en espera de recojo que superaron las 3 horas máximas.
     * 2. Limpia códigos de recuperación expirados y cupones de ruleta caducados (> 1 día).
     * 3. Borra del disco las fotos/imágenes huérfanas que no están vinculadas a ningún registro y tienen más de 1 día (24 horas).
     */
    @Scheduled(fixedDelay = 1800000, initialDelay = 20000)
    @Transactional
    public void ejecutarMantenimientoAutomatico() {
        try {
            marcarOrdenesDesatendidasPorTiempo();
            limpiarDatosTemporalesExpirados();
            eliminarImagenesHuerfanasMayoresAUnDia();
        } catch (Exception e) {
            System.out.println("Aviso en tarea de mantenimiento automático: " + e.getMessage());
        }
    }

    public void marcarOrdenesDesatendidasPorTiempo() {
        LocalDateTime limiteTresHoras = LocalDateTime.now().minusHours(3);
        List<Pedido> ordenesEnEspera = pedidoRepository.findByEstadoInOrderByFechaPedidoAsc(
                Arrays.asList("pendiente", "esperando_recojo", "preparando", "listo")
        );

        for (Pedido p : ordenesEnEspera) {
            if (p.getFechaPedido() != null && p.getFechaPedido().isBefore(limiteTresHoras)) {
                p.setEstado("desatendida");
                pedidoRepository.save(p);
            }
        }
    }

    private void limpiarDatosTemporalesExpirados() {
        LocalDateTime ahora = LocalDateTime.now();
        LocalDateTime haceUnDia = ahora.minusDays(1);

        // 1. Limpiar códigos de recuperación de contraseña caducados
        List<Usuario> usuarios = usuarioRepository.findAll();
        for (Usuario u : usuarios) {
            if (u.getExpiracionCodigo() != null && u.getExpiracionCodigo().isBefore(ahora)) {
                u.setCodigoRecuperacion(null);
                u.setExpiracionCodigo(null);
                usuarioRepository.save(u);
            }
        }

        // 2. Eliminar cupones temporales de ruleta (RUL-) vencidos o usados hace más de 1 día
        List<Cupon> cupones = cuponRepository.findAll();
        for (Cupon c : cupones) {
            String cod = c.getCodigo() != null ? c.getCodigo().toUpperCase() : "";
            if (cod.startsWith("RUL-")) {
                boolean vencido = c.getFechaVencimiento() != null && c.getFechaVencimiento().isBefore(haceUnDia);
                int usos = c.getUsosActuales() != null ? c.getUsosActuales() : 0;
                int limite = c.getLimiteUsos() != null ? c.getLimiteUsos() : 1;
                boolean agotadoYAntiguo = usos >= limite && c.getFechaVencimiento() != null
                        && c.getFechaVencimiento().minusDays(14).isBefore(ahora);
                if (vencido || agotadoYAntiguo) {
                    cuponRepository.delete(c);
                }
            }
        }
    }

    private void eliminarImagenesHuerfanasMayoresAUnDia() {
        Set<String> archivosActivos = recopilarArchivosEnUso();
        Instant limiteUnDia = Instant.now().minus(24, ChronoUnit.HOURS);

        List<String> raices = Arrays.asList(
                "uploads/images",
                "../../uploads/images",
                "src/main/resources/static/images"
        );

        int eliminados = 0;
        for (String raiz : raices) {
            for (String sub : SUBCARPETAS_IMAGENES) {
                Path dir = Paths.get(raiz, sub);
                if (Files.exists(dir) && Files.isDirectory(dir)) {
                    try (DirectoryStream<Path> stream = Files.newDirectoryStream(dir)) {
                        for (Path archivo : stream) {
                            if (Files.isRegularFile(archivo)) {
                                String nombre = archivo.getFileName().toString();
                                if (!archivosActivos.contains(nombre)) {
                                    Instant modTime = Files.getLastModifiedTime(archivo).toInstant();
                                    if (modTime.isBefore(limiteUnDia)) {
                                        Files.deleteIfExists(archivo);
                                        eliminados++;
                                    }
                                }
                            }
                        }
                    } catch (Exception ignored) {
                    }
                }
            }
        }

        if (eliminados > 0) {
            System.out.println("🧹 [LIMPIEZA AUTOMÁTICA] Se eliminaron " + eliminados + " imágenes sin uso con más de 1 día de antigüedad.");
        }
    }

    private Set<String> recopilarArchivosEnUso() {
        Set<String> enUso = new HashSet<>();

        for (Producto p : productoRepository.findAll()) {
            if (p.getImagenes() != null) {
                for (ImagenProducto img : p.getImagenes()) {
                    agregarNombreLimpio(enUso, img.getRutaImagen());
                }
            }
            if (p.getVariantes() != null) {
                for (ProductoVariante pv : p.getVariantes()) {
                    agregarNombreLimpio(enUso, pv.getRutaImagen());
                }
            }
        }

        for (Noticia n : noticiaRepository.findAll()) {
            agregarNombreLimpio(enUso, n.getImagenUrl());
        }

        for (Pedido ped : pedidoRepository.findAll()) {
            if (ped.getEstado() == null || !"cancelado".equalsIgnoreCase(ped.getEstado())) {
                agregarNombreLimpio(enUso, ped.getComprobantePago());
            }
        }

        return enUso;
    }

    private void agregarNombreLimpio(Set<String> set, String ruta) {
        if (ruta == null || ruta.trim().isEmpty()) return;
        String limpio = ruta.trim();
        int slash = Math.max(limpio.lastIndexOf('/'), limpio.lastIndexOf('\\'));
        if (slash >= 0 && slash < limpio.length() - 1) {
            limpio = limpio.substring(slash + 1);
        }
        set.add(limpio);
    }
}
