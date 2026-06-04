<?php
require_once 'db.php';

if (!isset($_GET['id']) || empty($_GET['id'])) {
    die("Error: No se proporcionó un ID de orden válido.");
}

$id_reserva = intval($_GET['id']);

try {
    $stmt = $pdo->prepare("
        SELECT r.*, u.nombre as cliente 
        FROM reservas r 
        JOIN usuarios u ON r.id_usuario = u.id_usuario 
        WHERE r.id_reserva = ?
    ");
    $stmt->execute([$id_reserva]);
    $orden = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$orden) {
        die("Error: No se encontró la orden solicitada.");
    }

    $stmt_det = $pdo->prepare("
        SELECT rd.cantidad, rd.precio_unitario, rd.estilo_seleccionado, p.nombre_comun 
        FROM reserva_detalles rd 
        JOIN productos p ON rd.id_cactus = p.id_producto 
        WHERE rd.id_reserva = ?
    ");
    $stmt_det->execute([$id_reserva]);
    $detalles = $stmt_det->fetchAll(PDO::FETCH_ASSOC);

    $fecha_impresion = date('d/m/Y, H:i');
    $fecha_orden = date('d/m/Y H:i', strtotime($orden['fecha_reserva']));
    $numero_orden = str_pad($id_reserva, 6, '0', STR_PAD_LEFT);
    $tipo_comprobante = strtoupper($orden['tipo_comprobante'] ?? 'BOLETA');
    
    $datos_dni = explode(' | ', $orden['dni_opcional']);
    $dni_limpio = trim($datos_dni[0] ?? 'No provisto');

} catch (PDOException $e) {
    die("Error de base de datos: " . $e->getMessage());
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprobante #<?php echo $id_reserva; ?></title>
    <style>
        body {
            background-color: #525659;
            display: flex;
            justify-content: center;
            padding: 40px 20px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            color: #000;
        }

        .ticket {
            background-color: #fff;
            width: 320px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }

        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        
        .header-top { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 15px; }
        .museum-title { font-size: 18px; font-weight: bold; margin: 10px 0 5px 0; letter-spacing: 1px; }
        .museum-info { font-size: 11px; line-height: 1.4; margin-bottom: 15px; }
        
        .divider { border-top: 1px dashed #000; margin: 15px 0; }
        
        .info-row { display: flex; margin-bottom: 5px; }
        .info-label { width: 100px; font-weight: bold; }
        .info-value { flex: 1; }

        table { width: 100%; border-collapse: collapse; }
        th { border-bottom: 1px dashed #000; padding-bottom: 5px; text-align: left; font-size: 11px; }
        td { padding: 8px 0; vertical-align: top; }
        .td-cant { width: 40px; }
        .td-total { width: 70px; text-align: right; }
        .item-style { font-size: 11px; color: #555; display: block; padding-left: 10px; font-style: italic; }

        .total-container { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 10px; }

        .footer-msg { font-size: 11px; text-align: center; margin-top: 20px; line-height: 1.6; }

        @media print {
            body { background-color: transparent; padding: 0; }
            .ticket { width: 100%; box-shadow: none; padding: 0; margin: 0; }
        }
    </style>
</head>
<body>

    <div class="ticket">
        
        <div class="header-top">
            <span><?php echo $fecha_impresion; ?></span>
            <span>Comprobante #<?php echo $id_reserva; ?></span>
        </div>

        <div class="text-center">
            <div class="museum-title">CACTUS MUSEUM</div>
            <div class="museum-info">
                Jr. San Cristóbal, Ayacucho<br>
                RUC: 20605194886<br>
                Tel: +51 981 851 430
            </div>
        </div>

        <div class="divider"></div>

        <div class="info-row"><div class="info-label">COMPROBANTE:</div><div class="info-value"><?php echo $tipo_comprobante; ?></div></div>
        <div class="info-row"><div class="info-label">ORDEN N°:</div><div class="info-value"><?php echo $numero_orden; ?></div></div>
        <div class="info-row"><div class="info-label">FECHA:</div><div class="info-value"><?php echo $fecha_orden; ?></div></div>
        <div class="info-row"><div class="info-label">CLIENTE:</div><div class="info-value"><?php echo htmlspecialchars($orden['cliente']); ?></div></div>
        <div class="info-row"><div class="info-label">DNI/RUC:</div><div class="info-value"><?php echo htmlspecialchars($dni_limpio); ?></div></div>

        <div class="divider"></div>

        <table>
            <thead>
                <tr>
                    <th class="td-cant">CANT</th>
                    <th>PRODUCTO</th>
                    <th class="td-total">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($detalles as $item): 
                    $subtotal = $item['cantidad'] * $item['precio_unitario'];
                ?>
                <tr>
                    <td class="td-cant"><?php echo $item['cantidad']; ?></td>
                    <td>
                        <?php echo htmlspecialchars($item['nombre_comun']); ?>
                        <?php if(!empty($item['estilo_seleccionado']) && $item['estilo_seleccionado'] !== 'Estándar' && $item['estilo_seleccionado'] !== 'Principal'): ?>
                            <span class="item-style">- Estilo: <?php echo htmlspecialchars($item['estilo_seleccionado']); ?></span>
                        <?php endif; ?>
                    </td>
                    <td class="td-total">S/ <?php echo number_format($subtotal, 2); ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <div class="divider"></div>

        <div class="total-container">
            <span>TOTAL:</span>
            <span>S/ <?php echo number_format($orden['total_pagado'], 2); ?></span>
        </div>

        <div class="divider"></div>

        <div class="footer-msg">
            ¡Gracias por tu compra!<br>
            Conserva tu planta con mucho amor<br><br>
            <small>Sujeto a políticas de cambio en tienda.</small>
        </div>

    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>