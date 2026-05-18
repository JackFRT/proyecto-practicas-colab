<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
require_once 'db.php';

$accion = $_POST['accion'] ?? null;
$data = $accion ? $_POST : (json_decode(file_get_contents("php://input"), true) ?? []);
$accion = $accion ?: ($data['accion'] ?? null);

function subirFoto($filePost, $prefijo, $carpeta = 'cactus') {
    if (isset($filePost) && $filePost['error'] == 0) {
        $nombre = $prefijo . "_" . time() . "_" . rand(100,999) . "." . pathinfo($filePost['name'], PATHINFO_EXTENSION);
        move_uploaded_file($filePost['tmp_name'], "images/$carpeta/" . $nombre);
        return $nombre;
    }
    return null;
}

if ($accion === 'guardar_producto') {
    try {
        $pdo->beginTransaction();

        $id_producto = !empty($data['id_cactus']) ? intval($data['id_cactus']) : null;
        $tipo = $data['tipo_producto'] ?? 'cactus'; 
        $nombre_comun = trim($data['nombre_comun']);
        $nombre_cientifico = trim($data['nombre_cientifico'] ?? '');
        $id_categoria = !empty($data['id_categoria']) ? intval($data['id_categoria']) : null; 
        $precio = floatval($data['precio']);
        $cuidados = trim($data['cuidados'] ?? '');
        $detalles_tecnicos = trim($data['detalles_tecnicos'] ?? '');
        
        if (!$id_producto) {
            $stmt = $pdo->prepare("INSERT INTO productos (tipo, nombre_comun, nombre_cientifico, id_categoria, precio_base, cuidados, detalles_tecnicos) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$tipo, $nombre_comun, $nombre_cientifico, $id_categoria, $precio, $cuidados, $detalles_tecnicos]);
            $id_producto = $pdo->lastInsertId();
            $mensaje = "Producto agregado exitosamente.";
        } else {
            $stmt = $pdo->prepare("UPDATE productos SET tipo=?, nombre_comun=?, nombre_cientifico=?, id_categoria=?, precio_base=?, cuidados=?, detalles_tecnicos=? WHERE id_producto=?");
            $stmt->execute([$tipo, $nombre_comun, $nombre_cientifico, $id_categoria, $precio, $cuidados, $detalles_tecnicos, $id_producto]);
            $mensaje = "Producto actualizado con éxito.";
            
            $pdo->prepare("DELETE FROM producto_variantes WHERE id_producto = ?")->execute([$id_producto]);
        }

        $tiene_estilos = isset($data['tiene_estilos']) && $data['tiene_estilos'] !== 'false' ? true : false;
        
        if ($tipo === 'recuerdo' && $tiene_estilos && isset($_POST['nombres_variantes']) && is_array($_POST['nombres_variantes'])) {
            $stmt_var = $pdo->prepare("INSERT INTO producto_variantes (id_producto, nombre_variante, stock, ruta_imagen) VALUES (?, ?, ?, ?)");
            $nombres = $_POST['nombres_variantes'];
            $stocks = $_POST['stocks_variantes'];
            $fotos_antiguas = $_POST['antiguas_fotos_variantes'] ?? [];
            $fotos_nuevas = $_FILES['fotos_variantes'] ?? null;

            for ($i = 0; $i < count($nombres); $i++) {
                $nom = trim($nombres[$i]);
                $stk = intval($stocks[$i] ?? 0);
                $img_variante = $fotos_antiguas[$i] ?? null;

                if (!empty($nom)) {
                    if ($fotos_nuevas && $fotos_nuevas['error'][$i] == 0) {
                        $file_arr = [
                            'name' => $fotos_nuevas['name'][$i],
                            'type' => $fotos_nuevas['type'][$i],
                            'tmp_name' => $fotos_nuevas['tmp_name'][$i],
                            'error' => $fotos_nuevas['error'][$i],
                            'size' => $fotos_nuevas['size'][$i]
                        ];
                        $nueva_ruta = subirFoto($file_arr, "var");
                        if ($nueva_ruta) {
                            $img_variante = $nueva_ruta;
                        }
                    }
                    
                    $stmt_var->execute([$id_producto, $nom, $stk, $img_variante]);
                }
            }
        } else {
            $pdo->prepare("INSERT INTO producto_variantes (id_producto, nombre_variante, stock) VALUES (?, 'Estándar', ?)")
                ->execute([$id_producto, intval($data['stock'] ?? 0)]);
        }

        $img_principal = subirFoto($_FILES['foto_principal'] ?? null, "main");
        $stmt_img = $pdo->prepare("INSERT INTO producto_imagenes (id_producto, ruta_imagen, es_portada) VALUES (?, ?, ?)");
        
        if ($img_principal) {
            $pdo->prepare("DELETE FROM producto_imagenes WHERE id_producto = ? AND es_portada = 1")->execute([$id_producto]);
            $stmt_img->execute([$id_producto, $img_principal, 1]);
        }
        
        if (isset($_FILES['fotos_adicionales'])) {
            $files = $_FILES['fotos_adicionales'];
            for ($i = 0; $i < count($files['name']); $i++) {
                if ($files['error'][$i] == 0) {
                    $file_arr = [
                        'name' => $files['name'][$i], 'type' => $files['type'][$i],
                        'tmp_name' => $files['tmp_name'][$i], 'error' => $files['error'][$i], 'size' => $files['size'][$i]
                    ];
                    $img_extra = subirFoto($file_arr, "galeria");
                    if ($img_extra) {
                        $stmt_img->execute([$id_producto, $img_extra, 0]);
                    }
                }
            }
        }

        $pdo->commit();
        echo json_encode(["success" => true, "mensaje" => $mensaje]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "mensaje" => "Error BD: " . $e->getMessage()]);
    }

} elseif ($accion === 'eliminar_producto') {
    $pdo->prepare("DELETE FROM productos WHERE id_producto = ?")->execute([$data['id_cactus']]);
    echo json_encode(["success" => true, "mensaje" => "Producto y sus variantes eliminados."]);

} elseif ($accion === 'guardar_categoria') {
    $id_cat = !empty($data['id_categoria']) ? intval($data['id_categoria']) : null;
    $nombre_cat = trim($data['nombre_categoria']);
    $tipo_cat = trim($data['tipo_categoria'] ?? 'cactus'); 
    
    if (!$id_cat) {
        $pdo->prepare("INSERT INTO categorias (nombre, tipo) VALUES (?, ?)")->execute([$nombre_cat, $tipo_cat]);
        echo json_encode(["success" => true, "mensaje" => "Categoría creada."]);
    } else {
        $pdo->prepare("UPDATE categorias SET nombre = ?, tipo = ? WHERE id_categoria = ?")->execute([$nombre_cat, $tipo_cat, $id_cat]);
        echo json_encode(["success" => true, "mensaje" => "Categoría actualizada."]);
    }
} elseif ($accion === 'eliminar_categoria') {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM productos WHERE id_categoria = ?");
    $stmt->execute([$data['id_categoria']]);
    if ($stmt->fetchColumn() > 0) {
        echo json_encode(["success" => false, "mensaje" => "No se puede eliminar. Hay productos usando esta categoría."]);
    } else {
        $pdo->prepare("DELETE FROM categorias WHERE id_categoria = ?")->execute([$data['id_categoria']]);
        echo json_encode(["success" => true, "mensaje" => "Categoría eliminada."]);
    }
}
?>