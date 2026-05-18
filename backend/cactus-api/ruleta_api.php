<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

if (file_exists('config/db.php')) { require_once 'config/db.php'; } 
else { require_once 'db.php'; }

$inputJSON = file_get_contents('php://input');
$inputData = json_decode($inputJSON, true);
if (is_array($inputData)) { $_POST = array_merge($_POST, $inputData); }

$accion = $_POST['accion'] ?? '';
$id_usuario = intval($_POST['id_usuario'] ?? 0);

if (!$id_usuario) { echo json_encode(["success" => false, "mensaje" => "Debes iniciar sesión."]); exit(); }

function yaGiroEstaSemana($pdo, $id_usuario) {
    $stmt = $pdo->prepare("SELECT fecha_ultimo_giro FROM usuarios WHERE id_usuario = ?");
    $stmt->execute([$id_usuario]);
    $fecha_giro = $stmt->fetchColumn();
    if ($fecha_giro) {
        $hoy = new DateTime();
        $ultimo_giro = new DateTime($fecha_giro);
        return $hoy->format('o-W') === $ultimo_giro->format('o-W');
    }
    return false;
}

if ($accion === 'cargar') {
    $ha_girado = yaGiroEstaSemana($pdo, $id_usuario);
    $stmt_premios = $pdo->query("SELECT id_premio, titulo, descuento_porcentaje, probabilidad, color_seccion FROM premios_ruleta WHERE probabilidad > 0 ORDER BY id_premio ASC");
    $premios = $stmt_premios->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(["success" => true, "ha_girado" => $ha_girado, "premios" => $premios]);
    exit();
}

if ($accion === 'girar') {
    if (yaGiroEstaSemana($pdo, $id_usuario)) {
        echo json_encode(["success" => false, "mensaje" => "Ya giraste esta semana. ¡Vuelve el lunes!"]);
        exit();
    }

    $stmt_premios = $pdo->query("SELECT * FROM premios_ruleta WHERE probabilidad > 0 ORDER BY id_premio ASC");
    $premios = $stmt_premios->fetchAll(PDO::FETCH_ASSOC);

    $random = mt_rand(1, 100);
    $acumulado = 0;
    $premio_ganado = null;

    foreach ($premios as $premio) {
        $acumulado += $premio['probabilidad'];
        if ($random <= $acumulado) { $premio_ganado = $premio; break; }
    }
    if (!$premio_ganado) $premio_ganado = $premios[0];

    $codigo_descuento = null;
    if ($premio_ganado['descuento_porcentaje'] > 0) {
        $codigo_descuento = "RUL-" . strtoupper(substr(uniqid(), -5));
        $stmt_cupon = $pdo->prepare("INSERT INTO cupones (codigo, descuento_porcentaje, id_usuario, limite_usos, fecha_vencimiento) VALUES (?, ?, ?, 1, DATE_ADD(NOW(), INTERVAL 7 DAY))");
        $stmt_cupon->execute([$codigo_descuento, $premio_ganado['descuento_porcentaje'], $id_usuario]);
    }

    $fecha_actual = date('Y-m-d H:i:s');
    $pdo->prepare("UPDATE usuarios SET fecha_ultimo_giro = ? WHERE id_usuario = ?")->execute([$fecha_actual, $id_usuario]);

    echo json_encode([
        "success" => true,
        "titulo" => $premio_ganado['titulo'],
        "descuento" => intval($premio_ganado['descuento_porcentaje']),
        "codigo" => $codigo_descuento
    ]);
    exit();
}
?>