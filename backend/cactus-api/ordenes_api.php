<?php
error_reporting(0);

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

$esSubidaDeArchivo = isset($_SERVER["CONTENT_TYPE"]) && strpos($_SERVER["CONTENT_TYPE"], "multipart/form-data") !== false;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($_POST) && empty($_FILES) && $_SERVER['CONTENT_LENGTH'] > 0 && $esSubidaDeArchivo) {
    echo json_encode(["success" => false, "mensaje" => "La imagen es demasiado pesada y el servidor la bloqueó. Por favor, toma una captura de pantalla del pago y sube esa versión."]);
    exit();
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
    $termino = "%" . ($_POST['termino'] ?? '') . "%";
    
    $stmt = $pdo->prepare("
        SELECT id_usuario, nombre, email, dni, rol 
        FROM usuarios 
        WHERE (nombre LIKE ? OR email LIKE ? OR dni LIKE ?) 
        AND rol IN ('cliente', 'admin') 
        LIMIT 5
    ");
    
    $stmt->execute([$termino, $termino, $termino]);
    echo json_encode(["success" => true, "clientes" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit();
}

if ($accion === 'registrar_visita') {
    $id_cliente = intval($_POST['id_cliente'] ?? 0);
    
    if (!$id_cliente) {
        echo json_encode(["success" => false, "mensaje" => "No se proporcionó un ID de cliente válido."]);
        exit();
    }

    try {
        $stmt_check = $pdo->prepare("SELECT fecha_ultima_visita, visitas_presenciales FROM usuarios WHERE id_usuario = ?");
        $stmt_check->execute([$id_cliente]);
        $cliente = $stmt_check->fetch(PDO::FETCH_ASSOC);

        if ($cliente) {
            $hoy = date('Y-m-d');

            if ($cliente['fecha_ultima_visita'] === $hoy) {
                echo json_encode(["success" => false, "mensaje" => "Este cliente ya registró una visita el día de hoy. ¡Debe volver mañana!"]);
                exit();
            }

            $stmt_update = $pdo->prepare("UPDATE usuarios SET visitas_presenciales = visitas_presenciales + 1, fecha_ultima_visita = ? WHERE id_usuario = ?");
            $stmt_update->execute([$hoy, $id_cliente]);

            echo json_encode(["success" => true, "mensaje" => "¡Visita presencial registrada con éxito!"]);
        } else {
            echo json_encode(["success" => false, "mensaje" => "Cliente no encontrado en la base de datos."]);
        }
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "mensaje" => "Error de base de datos: " . $e->getMessage()]);
    }
    exit();
}

if ($accion === 'crear_reserva') {
    $id_usuario = intval($_POST['id_usuario']);
    $codigo_cupon = trim($_POST['codigo_cupon'] ?? '');

    if (!empty($codigo_cupon)) {
        $stmt_uso = $pdo->prepare("SELECT COUNT(*) FROM reservas WHERE id_usuario = ? AND codigo_cupon = ? AND estado != 'cancelado'");
        $stmt_uso->execute([$id_usuario, $codigo_cupon]);
        
        if ($stmt_uso->fetchColumn() > 0) {
            echo json_encode(["success" => false, "mensaje" => "Error: Ya has utilizado este cupón anteriormente. ¡Solo es válido una vez por cuenta!"]);
            exit();
        }
    }

    try {
        $pdo->beginTransaction();

        $total = floatval($_POST['total_pagado']);
        $tipo_comprobante = $_POST['tipo_comprobante'] ?? 'ninguno';
        
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
        if (isset($_FILES['comprobante'])) {
            if ($_FILES['comprobante']['error'] == 1) { 
                echo json_encode(["success" => false, "mensaje" => "La imagen es demasiado pesada. Sube un recorte más pequeño o aumenta el límite en tu XAMPP."]);
                exit();
            } 
            elseif ($_FILES['comprobante']['error'] == 0) {
                $ruta_destino = 'images/comprobantes/';
                
                if (!file_exists($ruta_destino)) {
                    mkdir($ruta_destino, 0777, true);
                }
                
                $extension = pathinfo($_FILES['comprobante']['name'], PATHINFO_EXTENSION);
                $nombre_comprobante = "pago_" . $id_usuario . "_" . time() . "." . $extension;
                move_uploaded_file($_FILES['comprobante']['tmp_name'], $ruta_destino . $nombre_comprobante);
            }
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
        
    } catch (Throwable $e) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "mensaje" => "Error interno en el servidor: " . $e->getMessage()]);
    }
    exit();
}

if ($accion === 'validar_cupon') {
    $codigo = trim($_POST['codigo'] ?? '');
    $id_usuario = intval($_POST['id_usuario'] ?? 0);

    $stmt_cupon = $pdo->prepare("SELECT * FROM cupones WHERE codigo = ?");
    $stmt_cupon->execute([$codigo]);
    $cupon = $stmt_cupon->fetch(PDO::FETCH_ASSOC);

    if (!$cupon) {
        echo json_encode(["success" => false, "mensaje" => "El código ingresado no existe."]);
        exit();
    }

    if (!empty($cupon['id_usuario']) && $cupon['id_usuario'] != 0 && $cupon['id_usuario'] != $id_usuario) {
        echo json_encode(["success" => false, "mensaje" => "Este cupón pertenece a otra cuenta."]);
        exit();
    }

    $usos = intval($cupon['usos_actuales']);
    $limite = intval($cupon['limite_usos']);
    if ($limite > 0 && $usos >= $limite) {
        echo json_encode(["success" => false, "mensaje" => "Este cupón ya alcanzó su límite máximo de usos."]);
        exit();
    }

    $fecha_vencimiento = $cupon['fecha_vencimiento'];
    if ($fecha_vencimiento && $fecha_vencimiento !== '0000-00-00 00:00:00') {
        if (strtotime($fecha_vencimiento) < time()) {
            echo json_encode(["success" => false, "mensaje" => "El cupón expiró el " . date('d/m/Y', strtotime($fecha_vencimiento)) . "."]);
            exit();
        }
    }

    $stmt_uso = $pdo->prepare("SELECT COUNT(*) FROM reservas WHERE id_usuario = ? AND codigo_cupon = ? AND estado != 'cancelado'");
    $stmt_uso->execute([$id_usuario, $codigo]);
    if ($stmt_uso->fetchColumn() > 0) {
        echo json_encode(["success" => false, "mensaje" => "Ya utilizaste este código anteriormente. Solo es válido una vez por cuenta."]);
        exit();
    }

    echo json_encode(["success" => true, "descuento" => intval($cupon['descuento_porcentaje'])]);
    exit();
}

function descontarStockInteligente($pdo, $id_producto, $cantidad, $estilo_comprado) {
    if (empty($estilo_comprado) || $estilo_comprado === 'Principal') {
        $estilo_comprado = 'Estándar';
    }

    $stmt = $pdo->prepare("UPDATE producto_variantes SET stock = stock - ? WHERE id_producto = ? AND nombre_variante = ?");
    $stmt->execute([$cantidad, $id_producto, $estilo_comprado]);
}
?>