<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { 
    http_response_code(200); 
    exit(); 
}

require_once 'db.php';

$respuesta = [
    "success" => true,
    "cactus" => [],
    "souvenirs" => [],
    "categorias" => [],
    "noticias" => []
];

try {
    $stmt = $pdo->query("SELECT id_categoria, nombre, tipo FROM categorias ORDER BY nombre ASC");
    $respuesta["categorias"] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmt = $pdo->query("SELECT * FROM noticias WHERE estado = 1 ORDER BY fecha_publicacion DESC");
    $respuesta["noticias"] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmt_prod = $pdo->query("SELECT p.*, c.nombre as nombre_categoria FROM productos p LEFT JOIN categorias c ON p.id_categoria = c.id_categoria WHERE p.activo = 1");
    $productos_crudos = $stmt_prod->fetchAll(PDO::FETCH_ASSOC);

    foreach ($productos_crudos as $p) {
        $id = $p['id_producto'];

        $stmt_var = $pdo->prepare("SELECT * FROM producto_variantes WHERE id_producto = ?");
        $stmt_var->execute([$id]);
        $variantes = $stmt_var->fetchAll(PDO::FETCH_ASSOC);

        $stmt_img = $pdo->prepare("SELECT ruta_imagen FROM producto_imagenes WHERE id_producto = ? ORDER BY es_portada DESC");
        $stmt_img->execute([$id]);
        $imagenes = $stmt_img->fetchAll(PDO::FETCH_COLUMN);

        $p['variantes'] = $variantes;
        $p['imagenes'] = $imagenes;
        $p['id_cactus'] = $id;
        $p['precio'] = $p['precio_base'];
        
        $stock_total = count($variantes) > 0 ? array_sum(array_column($variantes, 'stock')) : 0;
        $p['stock'] = $stock_total;
        
        $p['imagen_url'] = count($imagenes) > 0 ? $imagenes[0] : 'placeholder.png';

        if ($stock_total > 0) {
            if ($p['tipo'] === 'cactus') {
                $respuesta["cactus"][] = $p;
            } else if ($p['tipo'] === 'recuerdo') {
                $respuesta["souvenirs"][] = $p;
            }
        }
    }

    echo json_encode($respuesta);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>