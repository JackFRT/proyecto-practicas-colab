<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200); exit();
}

if (file_exists('config/db.php')) { require_once 'config/db.php'; } 
else { require_once 'db.php'; }

$inputJSON = file_get_contents('php://input');
$inputData = json_decode($inputJSON, true);
if (is_array($inputData)) {
    $_POST = array_merge($_POST, $inputData);
}

$accion = $_POST['accion'] ?? '';

if (in_array($accion, ['aprobar', 'completar', 'cancelar', 'reportar'])) {
    try {
        $id_reserva = intval($_POST['id_reserva'] ?? 0);
        $id_empleado = intval($_POST['id_empleado'] ?? 0); 
        $mensaje = "";
        
        if ($accion === 'aprobar') {
            $pdo->prepare("UPDATE reservas SET estado = 'esperando_recojo', atendido_por = ? WHERE id_reserva = ?")->execute([$id_empleado, $id_reserva]);
            $mensaje = "Orden aprobada y lista para recojo.";
        } 
        elseif ($accion === 'completar') {
            $pdo->prepare("UPDATE reservas SET estado = 'recogido', atendido_por = ? WHERE id_reserva = ?")->execute([$id_empleado, $id_reserva]);
            $mensaje = "Orden entregada con éxito.";
        } 
        elseif ($accion === 'cancelar') {
            $pdo->prepare("UPDATE reservas SET estado = 'cancelado', atendido_por = ? WHERE id_reserva = ?")->execute([$id_empleado, $id_reserva]);
            $mensaje = "Orden rechazada y cancelada.";
        } 
        elseif ($accion === 'reportar') {
            $pdo->prepare("UPDATE reservas SET estado = 'cancelado', atendido_por = ? WHERE id_reserva = ?")->execute([$id_empleado, $id_reserva]);
            $mensaje = "Orden cancelada y usuario reportado.";
        }
        
        echo json_encode(["success" => true, "mensaje" => $mensaje]);
    } catch (Exception $e) {
        echo json_encode(["success" => false, "mensaje" => "Error de BD: " . $e->getMessage()]);
    }
    exit();
}

if ($accion === 'buscar_clientes') {
    $termino = "%" . trim($_POST['termino'] ?? '') . "%";
    $stmt = $pdo->prepare("SELECT id_usuario, nombre, email, dni FROM usuarios WHERE (nombre LIKE ? OR email LIKE ? OR dni LIKE ?) LIMIT 5");
    $stmt->execute([$termino, $termino, $termino]);
    echo json_encode(["success" => true, "clientes" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit();
}

if ($accion === 'registrar_visita') {
    $id_cliente = intval($_POST['id_cliente'] ?? 0);
    if ($id_cliente > 0) {
        $pdo->prepare("UPDATE usuarios SET visitas_presenciales = visitas_presenciales + 1 WHERE id_usuario = ?")->execute([$id_cliente]);
        echo json_encode(["success" => true, "mensaje" => "Visita presencial registrada exitosamente."]);
    } else {
        echo json_encode(["success" => false, "mensaje" => "Cliente no válido."]);
    }
    exit();
}

if ($accion === 'crear_reserva') {
    try {
        $pdo->beginTransaction();

        $id_usuario = intval($_POST['id_usuario']);
        $total = floatval($_POST['total_pagado']);
        $tipo_comprobante = $_POST['tipo_comprobante'] ?? 'ninguno';
        $codigo_cupon = trim($_POST['codigo_cupon'] ?? '');
        
        $dni_cliente = trim($_POST['dni_cliente'] ?? '');
        $telefono_cliente = trim($_POST['telefono_cliente'] ?? '');
        $actualizar_perfil = $_POST['actualizar_perfil'] ?? 'false';

        if ($actualizar_perfil === 'true') {
            $pdo->prepare("UPDATE usuarios SET dni = COALESCE(NULLIF(?, ''), dni), telefono = COALESCE(NULLIF(?, ''), telefono) WHERE id_usuario = ?")
                ->execute([$dni_cliente, $telefono_cliente, $id_usuario]);
        }

        $dni_opcional_reserva = $dni_cliente;
        if (!empty($telefono_cliente)) {
            $dni_opcional_reserva .= " | Cel/Wsp: " . $telefono_cliente;
        }

        $nombre_comprobante = null;
        if (isset($_FILES['comprobante']) && $_FILES['comprobante']['error'] == 0) {
            $extension = pathinfo($_FILES['comprobante']['name'], PATHINFO_EXTENSION);
            $nombre_comprobante = "pago_" . $id_usuario . "_" . time() . "." . $extension;
            move_uploaded_file($_FILES['comprobante']['tmp_name'], 'images/comprobantes/' . $nombre_comprobante);
        }

        $stmt = $pdo->prepare("INSERT INTO reservas (id_usuario, total_pagado, codigo_cupon, tipo_comprobante, dni_opcional, comprobante_pago, estado) 
                               VALUES (?, ?, ?, ?, ?, ?, 'pendiente')");
        $stmt->execute([$id_usuario, $total, $codigo_cupon, $tipo_comprobante, $dni_opcional_reserva, $nombre_comprobante]);
        $id_reserva_nueva = $pdo->lastInsertId();

        $carrito = json_decode($_POST['carrito'], true);
        
        $stmt_detalle = $pdo->prepare("INSERT INTO reserva_detalles (id_reserva, id_cactus, cantidad, precio_unitario, estilo_seleccionado) VALUES (?, ?, ?, ?, ?)");
        
        foreach ($carrito as $item) {
            $estilo = isset($item['estilo']) ? $item['estilo'] : 'Estándar';
            $cantidad = intval($item['cantidad']);
            $id_producto_angular = $item['id_cactus']; 
            
            $stmt_detalle->execute([$id_reserva_nueva, $id_producto_angular, $cantidad, $item['precio'], $estilo]);
            
            descontarStockInteligente($pdo, $id_producto_angular, $cantidad, $estilo);
        }

        if (!empty($codigo_cupon)) {
            $pdo->prepare("UPDATE cupones SET usos_actuales = usos_actuales + 1 WHERE codigo = ?")->execute([$codigo_cupon]);
            $stmt_check = $pdo->prepare("SELECT limite_usos, usos_actuales FROM cupones WHERE codigo = ?");
            $stmt_check->execute([$codigo_cupon]);
            $cup = $stmt_check->fetch();
            if ($cup && $cup['usos_actuales'] >= $cup['limite_usos']) {
                $pdo->prepare("DELETE FROM cupones WHERE codigo = ?")->execute([$codigo_cupon]);
            }
        }

        $cupon_regalo = null;
        $mensaje_fidelidad = "";

        $stmt_conteo = $pdo->prepare("SELECT SUM(rd.cantidad) as total_acumulado FROM reservas r JOIN reserva_detalles rd ON r.id_reserva = rd.id_reserva WHERE r.id_usuario = ? AND r.recompensa_procesada = 0 AND r.estado != 'cancelado'");
        $stmt_conteo->execute([$id_usuario]);
        $total_acumulado = $stmt_conteo->fetchColumn() ?: 0;

        if ($total_acumulado >= 4) {
            $codigo_generado = "MOKA-" . strtoupper(substr(uniqid(), -5));
            $pdo->prepare("INSERT INTO cupones (codigo, descuento_porcentaje, id_usuario, limite_usos, fecha_vencimiento) VALUES (?, 25, ?, 1, DATE_ADD(NOW(), INTERVAL 2 MONTH))")->execute([$codigo_generado, $id_usuario]);
            $pdo->prepare("UPDATE reservas SET recompensa_procesada = 1 WHERE id_usuario = ? AND recompensa_procesada = 0")->execute([$id_usuario]);
            
            $cupon_regalo = ["codigo" => $codigo_generado, "descuento" => 25];
            $mensaje_fidelidad = "¡Felicidades! Has alcanzado 4 plantas en tu colección.";
        } else {
            $faltantes = 4 - $total_acumulado;
            $mensaje_fidelidad = "¡Vas por buen camino! Te faltan solo $faltantes plantas para obtener tu próximo premio.";
        }

        $pdo->commit();
        echo json_encode(["success" => true, "id_reserva" => $id_reserva_nueva, "premio_lealtad" => $cupon_regalo, "mensaje_fidelidad" => $mensaje_fidelidad]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "mensaje" => "Error al guardar en BD: " . $e->getMessage()]);
    }
    exit();
}

if ($accion === 'validar_cupon') {
    $codigo = trim($_POST['codigo'] ?? '');
    $id_usuario = intval($_POST['id_usuario'] ?? 0);
    $stmt = $pdo->prepare("
        SELECT descuento_porcentaje 
        FROM cupones 
        WHERE codigo = ? 
        AND usos_actuales < limite_usos 
        AND fecha_vencimiento >= NOW() 
        AND (id_usuario = ? OR id_usuario IS NULL)
    ");
    $stmt->execute([$codigo, $id_usuario]);
    $cupon = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($cupon) {
        echo json_encode(["success" => true, "descuento" => intval($cupon['descuento_porcentaje'])]);
    } else {
        echo json_encode(["success" => false, "mensaje" => "Cupón inválido, agotado o ya vencido."]);
    }
    exit();
}

echo json_encode(["success" => false, "mensaje" => "Acción no reconocida."]);
exit();

function descontarStockInteligente($pdo, $id_producto, $cantidad, $estilo_comprado) {
    if (empty($estilo_comprado) || $estilo_comprado === 'Principal') {
        $estilo_comprado = 'Estándar';
    }

    $stmt = $pdo->prepare("UPDATE producto_variantes SET stock = stock - ? WHERE id_producto = ? AND nombre_variante = ?");
    $stmt->execute([$cantidad, $id_producto, $estilo_comprado]);
}
?>