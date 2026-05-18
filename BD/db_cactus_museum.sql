-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 18-05-2026 a las 18:37:45
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `db_cactus_museum`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id_categoria` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('cactus','recuerdo','ropa','cafe','otro') NOT NULL DEFAULT 'cactus'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id_categoria`, `nombre`, `tipo`) VALUES
(1, 'Suculentas', 'cactus'),
(2, 'Cactus Variegados', 'cactus'),
(3, 'Opuntias', 'cactus'),
(4, 'Agaves', 'cactus'),
(5, 'Aloes', 'cactus'),
(6, 'Cactus de coleccion', 'cactus'),
(7, 'Cactus', 'cactus'),
(8, 'Cerámica', 'recuerdo'),
(9, 'Artesanías', 'recuerdo');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `codigos_reseteo`
--

CREATE TABLE `codigos_reseteo` (
  `id_codigo` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `codigo` varchar(6) NOT NULL,
  `expira_en` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cupones`
--

CREATE TABLE `cupones` (
  `id_cupon` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `descuento_porcentaje` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `limite_usos` int(11) DEFAULT 1,
  `usos_actuales` int(11) DEFAULT 0,
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  `fecha_vencimiento` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

--
-- Volcado de datos para la tabla `cupones`
--

INSERT INTO `cupones` (`id_cupon`, `codigo`, `descuento_porcentaje`, `id_usuario`, `limite_usos`, `usos_actuales`, `fecha_creacion`, `fecha_vencimiento`) VALUES
(7, 'RUL-B9D1E', 7, 1, 1, 0, '2026-03-18 20:57:35', '2026-03-25 20:57:35'),
(8, 'RUL-26232', 5, 1, 1, 0, '2026-03-18 21:08:00', '2026-03-25 21:08:00'),
(9, 'ANIVERSARIO1', 20, NULL, 10, 0, '2026-03-18 21:26:28', '2026-04-01 21:26:28'),
(10, 'RUL-BA227', 5, 2, 1, 0, '2026-03-18 21:28:07', '2026-03-25 21:28:07'),
(11, 'RUL-01703', 5, 1, 1, 0, '2026-04-04 20:01:22', '2026-04-11 20:01:22'),
(12, 'RUL-418FE', 5, 1, 1, 0, '2026-04-07 21:32:28', '2026-04-14 21:32:28'),
(14, 'MOKA-04546', 25, 1, 1, 0, '2026-04-14 15:25:34', '2026-06-14 15:25:34'),
(15, 'MOKA-13B89', 25, 1, 1, 0, '2026-04-15 14:28:43', '2026-06-15 14:28:43'),
(16, 'MOKA-00C58', 25, 1, 1, 0, '2026-04-15 14:41:12', '2026-06-15 14:41:12'),
(18, 'RUL-6EBA1', 5, 1, 1, 0, '2026-04-19 17:03:14', '2026-04-26 17:03:14'),
(19, 'RUL-EAC06', 15, 1, 1, 0, '2026-04-19 17:03:35', '2026-04-26 17:03:35'),
(20, 'RUL-375CC', 15, 1, 1, 0, '2026-04-19 17:09:41', '2026-04-26 17:09:41'),
(21, 'RUL-9B0D2', 5, 1, 1, 0, '2026-04-19 17:23:57', '2026-04-26 17:23:57'),
(22, 'MOKA-A3A90', 25, 1, 1, 0, '2026-04-23 22:19:44', '2026-06-23 22:19:44'),
(23, 'MOKA-4410E', 25, 1, 1, 0, '2026-04-27 23:28:25', '2026-06-26 23:28:25'),
(24, 'MOKA-704BE', 25, 1, 1, 0, '2026-04-27 23:32:56', '2026-06-26 23:32:56'),
(25, 'MOKA-35529', 25, 1, 1, 0, '2026-04-27 23:40:41', '2026-06-26 23:40:41'),
(26, 'MOKA-3377E', 25, 1, 1, 0, '2026-04-27 23:41:03', '2026-06-26 23:41:03'),
(27, 'MOKA-95A89', 25, 1, 1, 0, '2026-04-27 23:46:14', '2026-06-27 23:46:14'),
(28, 'MOKA-E9837', 25, 1, 1, 0, '2026-04-28 00:22:22', '2026-06-28 00:22:22'),
(29, 'MOKA-48212', 25, 2, 1, 0, '2026-04-28 00:27:02', '2026-06-28 00:27:02'),
(30, 'AYA-CAC-MUS', 25, NULL, 150, 0, '2026-04-28 22:30:15', '2026-05-28 22:30:15'),
(31, 'RUL-D5E3B', 5, 1, 1, 0, '2026-05-13 17:31:08', '2026-05-20 17:31:08'),
(32, 'RUL-86FE8', 15, 1, 1, 0, '2026-05-14 22:32:59', '2026-05-21 22:32:59'),
(33, 'RUL-DCC19', 5, 1, 1, 0, '2026-05-17 18:36:36', '2026-05-24 18:36:36'),
(34, 'MOKA-E4FA1', 25, 1, 1, 0, '2026-05-18 08:05:28', '2026-07-18 08:05:28'),
(36, 'MOKA-144D4', 25, 4, 1, 0, '2026-05-18 10:58:10', '2026-07-18 10:58:10');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `noticias`
--

CREATE TABLE `noticias` (
  `id_noticia` int(11) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `imagen_url` varchar(255) NOT NULL,
  `link_destino` varchar(255) DEFAULT NULL,
  `estado` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_publicacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `prioridad` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `noticias`
--

INSERT INTO `noticias` (`id_noticia`, `titulo`, `descripcion`, `imagen_url`, `link_destino`, `estado`, `fecha_publicacion`, `prioridad`) VALUES
(1, 'Inauguración del museo', 'El museo del cactus abrió sus puertas el 22 de julio del 2024 al público.', 'news_1776212775_653.jpg', 'https://www.facebook.com/Henryayalahinostroza/', 1, '2026-04-15 00:26:15', 1),
(2, 'Charlas con el Ingeniero Henry.', 'El ingeniero Henry Hinostroza nos demuestra la perseverancia y como alcanzar nuestros objetivos mediante el esfuerzo. Únete a las charlas de motivación y desarrollo personal.', 'news_1776283315_102.png', '', 1, '2026-04-15 20:01:55', 2),
(3, 'Museo del Agua - Ritipata', 'A 4950 m.s.n.m. puesta en valor nuestro recurso más importante de la región de Ayacucho, en cabecera de cuenca, su majestad el agua de Ritipata, que su trauecto después de llegar a Cuchuquesera', 'news_1776290115_649.jpeg', '', 1, '2026-04-15 21:55:15', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `premios_ruleta`
--

CREATE TABLE `premios_ruleta` (
  `id_premio` int(11) NOT NULL,
  `titulo` varchar(100) NOT NULL,
  `descuento_porcentaje` int(11) DEFAULT 0,
  `probabilidad` int(11) NOT NULL,
  `color_seccion` varchar(20) DEFAULT '#A3B18A',
  `activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

--
-- Volcado de datos para la tabla `premios_ruleta`
--

INSERT INTO `premios_ruleta` (`id_premio`, `titulo`, `descuento_porcentaje`, `probabilidad`, `color_seccion`, `activo`) VALUES
(6, '5% de descuento', 5, 21, '#a3b18a', 1),
(7, 'Suerte para la próxima', 0, 50, '#d9b5b5', 1),
(8, '7% de descuento', 7, 20, '#ffbde3', 1),
(9, '15% de descuento', 15, 9, '#f7ff80', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id_producto` int(11) NOT NULL,
  `tipo` enum('cactus','recuerdo','ropa','cafe','otro') NOT NULL DEFAULT 'cactus',
  `nombre_comun` varchar(100) NOT NULL,
  `nombre_cientifico` varchar(100) DEFAULT NULL,
  `id_categoria` int(11) DEFAULT NULL,
  `precio_base` decimal(10,2) NOT NULL,
  `cuidados` text DEFAULT NULL,
  `detalles_tecnicos` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `tipo`, `nombre_comun`, `nombre_cientifico`, `id_categoria`, `precio_base`, `cuidados`, `detalles_tecnicos`, `activo`) VALUES
(1, 'cactus', 'California Sunset / Suculenta Rosada', 'Graptosedum \'California Sunset\'', 1, 20.00, '- Necesita mucha luz (Sol directo suave o luz brillante indirecta)\r\n- Regar solo cuando la tierra esté completamente seca.\r\n- Evitar encharcamientos (Podría podrirse fácilmente)\r\n- Debe tener un drenaje excelente (50% arena gruesa y 50% piedras pequeñas)\r\n- Temperatura ideal entre 15° - 25°', 'Es una Suculenta Perenne, su forma de rosetas compactas crecen en tallos. Tiene tonos verdes y rosados, anaranjados si hay demasiado sol.\r\nLlega a medir entre 10 - 20 cm aprox.\r\nTiene un crecimiento moderado, puede llegar a formar grupos o \"colonias\".', 1),
(2, 'cactus', 'Biznaga pequeña / Mamilaria', 'Mammillaria sp.', 3, 30.00, '- Necesita mucha luz solar directa (4 - 6 horas de sol al día)\r\n- Si no recibe suficiente luz, se deforma\r\n- Necesita de poco riego (Verano cada 10 - días, Invierno una vez al mes)\r\n- Siempre deja que el sustrato se seque completamente\r\n- Temperatura ideal entre 18 - 30 °C (Tolera bien el calor, pero evita las heladas <5 °C)', '- Forma Globosa a cilíndrica\r\n- Superficie cubierta de tubérculos que no son costillas como otros cactus\r\n- Espinas finas y abundantes blancas o amarillentas\r\n- Es de crecimiento lento\r\n- Mide entre 5 - 20 cm', 1),
(3, 'cactus', 'Maguey pequeño / Agave ornamental', 'Agave potatorum', 1, 15.00, '- Necesita mucho sol directo (Lo ideal sería en el exterior o una ventana muy iluminada)\r\n- Debe tener un riego muy moderado (Solo cuando el sustrato esté completamente seco)\r\n- Temperatura ideal entre 20 - 30 °C (Tolera el calor fuerte pero no las heladas <5 °C)', '- Tiene forma de roseta compacta\r\n- Tiene hojas gruesas, azul-verdosas con punta negra\r\n- Sus espinas tienen bordes con pequeños dientes\r\n- Puede medir entre 5 - 20 cm\r\n- Es de crecimiento lento\r\n- Resiste más a la sequía que al exceso de agua', 1),
(4, 'recuerdo', 'Cactus de cerámica', '', 8, 20.00, 'Un bonito cactus en maceta hecho completamente de cerámica, ideal para una bonita decoración en una repisa.', '- Hecho de cerámica\r\n- 15 cm de alto', 1),
(5, 'recuerdo', 'Cactus en Miniatura', '', 9, 3.00, 'Pequeños cactus en miniatura hechos de cartón y papel, pintados a mano.', '- Papel y cartón\r\n- Mide 5 cm', 1),
(7, 'cactus', 'Euphorbia crestada / Cactus monstruoso', 'Euphorbia lactea cristata', 1, 20.00, 'Luz: Mucha luz, ideal sol directo moderado.\r\nRiego: Bajo, dejar secar completamente el sustrato.\r\nSustrato: Muy bien drenado (tipo cactus).\r\nClima: Cálido, no tolera frío extremo.\r\nCuidado: Produce látex (puede irritar la piel).', 'Tipo: Suculenta.\r\nForma: Crestada / crecimiento irregular.\r\nColor: Verde intenso.\r\nEspinas: Presentes.\r\nCrecimiento: Lento.\r\nUso: Ornamental, colección.\r\nReproducción: Injerto o esqueje (más complejo).', 1),
(8, 'cactus', 'Rosa de piedra / Echeveria roja', 'Echeveria agavoides', 1, 30.00, 'Luz: Mucha luz solar directa o semisombra\r\nRiego: Moderado, solo cuando el sustrato esté seco\r\nSustrato: Bien drenado (mezcla para cactus/suculentas)\r\nClima: Cálido, evitar heladas\r\nEvitar exceso de agua (puede pudrirse)', 'Tipo: Planta suculenta ornamental.\r\nCrecimiento: Lento.\r\nForma: Roseta compacta.\r\nColor: Verde con bordes rojizos.\r\nUso: Decoración interior/exterior, jardines, macetas.\r\nReproducción: Hijuelos o hojas.', 1),
(9, 'cactus', 'Crassula roja / Suculenta campfire', 'Crassula capitella', 1, 25.00, 'Luz: Mucha luz o sol directo (el sol intensifica el color rojo).\r\nRiego: Moderado-bajo, dejar secar el sustrato entre riegos.\r\nSustrato: Bien drenado.\r\nClima: Cálido, evitar heladas.\r\nPoda: Se puede podar para controlar altura.', 'Tipo: Suculenta ornamental.\r\nForma: Tallos alargados con rosetas en las puntas.\r\nColor: Verde que se vuelve rojo con el sol.\r\nCrecimiento: Medio (más rápido que otras suculentas).\r\nUso: Macetas, jardines, decoración exterior.\r\nReproducción: Esquejes de tallo.', 1),
(10, 'cactus', 'Cactus copo de nieve / Mammillaria blanca', 'Mammillaria elongata', 2, 35.00, 'Luz: Mucha luz, ideal sol directo.\r\nRiego: Bajo, solo cuando el sustrato esté completamente seco.\r\nSustrato: Especial para cactus (excelente drenaje).\r\nClima: Cálido, tolera sequía.\r\nEvitar exceso de agua (muy sensible a pudrición).', 'Tipo: Cactus ornamental.\r\nForma: Agrupada / crecimiento en racimo.\r\nColor: Verde cubierto de espinas blancas.\r\nEspinas: Finas y abundantes.\r\nCrecimiento: Medio (forma colonias).\r\nUso: Decoración, colección.\r\nReproducción: Separación de hijuelos.', 1),
(11, 'cactus', 'Cactus botón / Epithelantha', 'Epithelantha bokei', 7, 30.00, 'Luz: Luz brillante, sol suave o directo moderado.\r\nRiego: Muy bajo, dejar secar completamente el sustrato.\r\nSustrato: Muy drenante (mezcla mineral para cactus).\r\nClima: Cálido, evitar humedad excesiva.\r\nSensible al exceso de agua.', 'Tipo: Cactus miniatura.\r\nForma: Globosa y agrupada.\r\nColor: Verde cubierto de espinas blancas finas.\r\nEspinas: Muy finas, aspecto “algodón”.\r\nCrecimiento: Lento.\r\nTamaño: Pequeño (ideal colección).\r\nUso: Decorativo, colección.\r\nReproducción: Hijuelos o semillas.', 1),
(12, 'cactus', 'Cabeza de Medusa', 'Euphorbia flanaganii', 1, 23.00, 'Luz: Mucha luz, sol suave o semisombra.\r\nRiego: Moderado-bajo, dejar secar el sustrato entre riegos.\r\nSustrato: Muy bien drenado (tipo cactus/suculentas).\r\nClima: Cálido, no tolera frío extremo.\r\nProduce látex (puede irritar piel y ojos).', 'Tipo: Suculenta.\r\nForma: Base central con tallos largos tipo “tentáculos”.\r\nColor: Verde.\r\nCrecimiento: Medio.\r\nTamaño: Puede expandirse horizontalmente.\r\nUso: Ornamental, colección.\r\nReproducción: Esquejes de tallo.', 1),
(13, 'recuerdo', 'Cactus de lana', '', 9, 9.00, 'Un lindo decorado hecho artesanalmente con lana y cariño hacia los amigos espinosos.', '- Lana\r\n- Mide 6 cm', 1),
(16, 'cactus', 'Kjhdbdu', 'kad jh s', 4, 12.00, 'kdsj f\r\ndsv\r\ndv\r\nsdf', 'dsvcv\r\nsdvsdvsdvdvs', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_imagenes`
--

CREATE TABLE `producto_imagenes` (
  `id_imagen` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `ruta_imagen` varchar(255) NOT NULL,
  `es_portada` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

--
-- Volcado de datos para la tabla `producto_imagenes`
--

INSERT INTO `producto_imagenes` (`id_imagen`, `id_producto`, `ruta_imagen`, `es_portada`) VALUES
(1, 1, 'main_1773709292_139.jpeg', 1),
(2, 2, 'main_1773879023_979.jpg', 1),
(3, 3, 'main_1773879450_300.jpg', 1),
(4, 4, 'main_1776222447_311.jpg', 1),
(5, 5, 'main_1776222560_813.jpg', 1),
(6, 7, 'main_1776292390_234.jpg', 1),
(7, 8, 'main_1776292412_629.jpg', 1),
(8, 9, 'main_1776292758_508.jpg', 1),
(9, 10, 'main_1776293203_867.jpg', 1),
(10, 11, 'main_1776293658_898.jpg', 1),
(11, 12, 'main_1776293983_891.jpg', 1),
(12, 13, 'main_1777350008_615.jpg', 1),
(16, 1, 'ex1_1773709292_672.jpg', 0),
(17, 2, 'ex1_1773879023_652.jpg', 0),
(18, 3, 'ex1_1773879450_698.jpg', 0),
(19, 5, 'ex1_1776222560_840.jpg', 0),
(20, 7, 'ex1_1776292390_990.jpg', 0),
(21, 8, 'ex1_1776292412_472.jpg', 0),
(22, 9, 'ex1_1776292758_393.jpg', 0),
(23, 10, 'ex1_1776293203_702.jpg', 0),
(24, 11, 'ex1_1776293658_969.jpg', 0),
(25, 12, 'ex1_1776293983_206.jpg', 0),
(26, 13, 'ex1_1777350008_784.jpg', 0),
(31, 1, 'ex2_1773709292_714.jpg', 0),
(32, 5, 'ex2_1776222560_641.jpg', 0),
(33, 13, 'ex2_1777350008_399.jpg', 0),
(34, 5, 'ex3_1776222560_934.jpg', 0),
(45, 16, 'main_1779119731_491.jpg', 1),
(46, 16, 'galeria_1779119731_893.jpg', 0),
(47, 16, 'galeria_1779119731_798.jpg', 0),
(48, 16, 'galeria_1779119731_772.jpg', 0),
(49, 16, 'galeria_1779119731_330.jpeg', 0),
(50, 16, 'galeria_1779119731_349.jpg', 0),
(51, 16, 'galeria_1779119731_127.jpg', 0),
(52, 16, 'galeria_1779119731_742.jpg', 0),
(53, 16, 'galeria_1779119731_275.jpg', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_variantes`
--

CREATE TABLE `producto_variantes` (
  `id_variante` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `nombre_variante` varchar(100) NOT NULL DEFAULT 'Estándar',
  `stock` int(11) NOT NULL DEFAULT 0,
  `ruta_imagen` varchar(255) DEFAULT NULL,
  `precio_adicional` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

--
-- Volcado de datos para la tabla `producto_variantes`
--

INSERT INTO `producto_variantes` (`id_variante`, `id_producto`, `nombre_variante`, `stock`, `ruta_imagen`, `precio_adicional`) VALUES
(1, 1, 'Estándar', 4, NULL, 0.00),
(2, 2, 'Estándar', 0, NULL, 0.00),
(3, 3, 'Estándar', 0, NULL, 0.00),
(6, 7, 'Estándar', 12, NULL, 0.00),
(7, 8, 'Estándar', 3, NULL, 0.00),
(8, 9, 'Estándar', 6, NULL, 0.00),
(9, 10, 'Estándar', 2, NULL, 0.00),
(10, 11, 'Estándar', 2, NULL, 0.00),
(11, 12, 'Estándar', 9, NULL, 0.00),
(24, 13, 'Color Rosa', 9, '', 0.00),
(25, 13, 'Color Amarillo', 4, '', 0.00),
(29, 4, 'Estándar', 2, '', 0.00),
(31, 5, 'Estilo 1', 6, '', 0.00),
(32, 5, 'Estilo 2', 0, '', 0.00),
(33, 5, 'Estilo 3', 5, '', 0.00),
(35, 16, 'Estándar', 21, NULL, 0.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reservas`
--

CREATE TABLE `reservas` (
  `id_reserva` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `atendido_por` int(11) DEFAULT NULL,
  `estado` enum('pendiente','esperando_recojo','recogido','cancelado') DEFAULT 'pendiente',
  `dni_opcional` varchar(100) DEFAULT NULL,
  `fecha_reserva` timestamp NOT NULL DEFAULT current_timestamp(),
  `comprobante_pago` varchar(255) DEFAULT NULL,
  `recompensa_procesada` tinyint(1) DEFAULT 0,
  `tipo_comprobante` enum('boleta','factura') DEFAULT 'boleta',
  `total_pagado` decimal(10,2) DEFAULT NULL,
  `codigo_cupon` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

--
-- Volcado de datos para la tabla `reservas`
--

INSERT INTO `reservas` (`id_reserva`, `id_usuario`, `atendido_por`, `estado`, `dni_opcional`, `fecha_reserva`, `comprobante_pago`, `recompensa_procesada`, `tipo_comprobante`, `total_pagado`, `codigo_cupon`) VALUES
(1, 1, 1, 'recogido', '', '2026-03-19 00:23:49', 'pago_1_1773879829.jpg', 1, 'boleta', 20.00, ''),
(2, 1, 1, 'recogido', '', '2026-03-19 00:31:36', 'pago_1_1773880296.jpg', 1, 'factura', 51.00, 'RUL-AC927'),
(3, 1, 1, 'cancelado', '', '2026-03-19 00:39:26', 'pago_1_1773880766.jpg', 1, 'boleta', 38.25, 'RUL-AC927'),
(4, 1, 1, 'cancelado', '', '2026-03-19 01:38:22', 'pago_1_1773884302.jpg', 1, 'boleta', 30.00, ''),
(5, 2, 1, 'cancelado', '', '2026-03-19 02:20:50', 'pago_2_1773886850.jpg', 1, 'boleta', 20.00, ''),
(6, 1, 1, 'cancelado', '', '2026-04-04 23:49:52', 'pago_1_1775346592.jpg', 1, 'boleta', 20.00, ''),
(7, 1, 1, 'recogido', '', '2026-04-05 04:15:31', 'pago_1_1775362531.jpg', 1, 'boleta', 20.00, ''),
(8, 1, 1, 'cancelado', ' | Cel/Wsp: 987', '2026-04-14 20:18:42', 'pago_1_1776197922.webp', 1, 'boleta', 90.00, ''),
(9, 1, 1, 'recogido', '87654321 | Cel/Wsp: 987654321', '2026-04-14 20:25:33', 'pago_1_1776198333.webp', 1, 'boleta', 105.00, ''),
(10, 1, 1, 'cancelado', '87654321 | Cel/Wsp: 987654321', '2026-04-15 19:28:43', 'pago_1_1776281323.jpg', 1, 'boleta', 56.00, ''),
(11, 1, 1, 'recogido', '87654321 | Cel/Wsp: 987654321', '2026-04-15 19:41:11', 'pago_1_1776282071.jpeg', 1, 'boleta', 32.00, ''),
(12, 1, 1, '', '87654321', '2026-04-15 21:43:27', 'pago_1_1776289407.jpg', 1, 'boleta', 17.25, 'MOKA-2A20A'),
(21, 1, 1, 'recogido', '87654321 | Cel/Wsp: 987654321', '2026-04-28 05:22:22', 'pago_1_1777353742.png', 1, 'boleta', 196.00, ''),
(22, 2, 3, 'recogido', '12345678 | Cel/Wsp: 123456789', '2026-04-28 05:27:02', 'pago_2_1777354022.png', 1, 'boleta', 89.00, ''),
(23, 1, 1, 'recogido', '87654321 | Cel/Wsp: 987654321', '2026-04-28 05:35:52', 'pago_1_1777354552.png', 1, 'boleta', 15.00, ''),
(24, 1, NULL, 'pendiente', '87654321 | Cel/Wsp: 987654321', '2026-05-15 03:42:05', 'pago_1_1778816525.png', 1, 'boleta', 20.00, ''),
(25, 1, NULL, 'pendiente', '87654321 | Cel/Wsp: 987654321', '2026-05-18 13:05:28', 'pago_1_1779109528.jpg', 1, 'boleta', 62.00, ''),
(26, 4, NULL, 'pendiente', '11223344 | Cel/Wsp: 987644321', '2026-05-18 15:58:10', 'pago_4_1779119890.jpg', 1, 'boleta', 85.00, 'RUL-34FF7');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reserva_detalles`
--

CREATE TABLE `reserva_detalles` (
  `id_detalle` int(11) NOT NULL,
  `id_reserva` int(11) NOT NULL,
  `id_cactus` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL DEFAULT 1,
  `estilo_seleccionado` varchar(100) DEFAULT NULL,
  `precio_unitario` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

--
-- Volcado de datos para la tabla `reserva_detalles`
--

INSERT INTO `reserva_detalles` (`id_detalle`, `id_reserva`, `id_cactus`, `cantidad`, `estilo_seleccionado`, `precio_unitario`) VALUES
(1, 1, 1, 1, NULL, 20.00),
(2, 5, 1, 1, NULL, 20.00),
(3, 6, 1, 1, NULL, 20.00),
(4, 7, 1, 1, NULL, 20.00),
(5, 2, 2, 2, NULL, 30.00),
(6, 4, 2, 1, NULL, 30.00),
(7, 3, 3, 3, NULL, 15.00),
(8, 8, 1, 3, NULL, 20.00),
(9, 8, 2, 1, NULL, 30.00),
(10, 9, 1, 3, NULL, 20.00),
(11, 9, 2, 1, NULL, 30.00),
(12, 9, 3, 1, NULL, 15.00),
(13, 10, 5, 2, 'Estándar', 3.00),
(14, 10, 4, 1, 'Estándar', 20.00),
(15, 10, 2, 1, 'Estándar', 30.00),
(16, 11, 5, 1, 'Estilo 3', 3.00),
(17, 11, 5, 3, 'Estilo 2', 3.00),
(18, 11, 1, 1, 'Estándar', 20.00),
(19, 12, 1, 1, 'Estándar', 20.00),
(20, 12, 5, 1, 'Principal', 3.00),
(45, 21, 2, 4, 'Estándar', 30.00),
(46, 21, 3, 1, 'Estándar', 15.00),
(47, 21, 7, 1, 'Estándar', 20.00),
(48, 21, 13, 1, 'Color Amarillo', 9.00),
(49, 21, 4, 1, 'Estándar', 20.00),
(50, 21, 5, 2, 'Estilo 2', 3.00),
(51, 21, 5, 2, 'Estilo 3', 3.00),
(52, 22, 2, 1, 'Estándar', 30.00),
(53, 22, 3, 2, 'Estándar', 15.00),
(54, 22, 7, 1, 'Estándar', 20.00),
(55, 22, 13, 1, 'Color Amarillo', 9.00),
(56, 23, 3, 1, 'Estándar', 15.00),
(57, 24, 7, 1, 'Estándar', 20.00),
(58, 25, 4, 1, 'Estándar', 20.00),
(59, 25, 5, 4, 'Estilo 2', 3.00),
(60, 25, 8, 1, 'Estándar', 30.00),
(61, 26, 1, 3, 'Estándar', 20.00),
(62, 26, 4, 2, 'Estándar', 20.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('cliente','empleado','admin') DEFAULT 'cliente',
  `visitas_presenciales` int(11) DEFAULT 0,
  `productos_comprados` int(11) DEFAULT 0,
  `fecha_ultimo_giro` datetime DEFAULT NULL,
  `giros_extra` int(11) DEFAULT 0,
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp(),
  `bloqueado_hasta` datetime DEFAULT NULL,
  `dni` varchar(15) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `nombre`, `email`, `password`, `rol`, `visitas_presenciales`, `productos_comprados`, `fecha_ultimo_giro`, `giros_extra`, `fecha_registro`, `bloqueado_hasta`, `dni`, `telefono`) VALUES
(1, 'Jack', 'jackramos@gmail.com', '$2y$10$T62Kx0kthrm4sT.vQrIm6.EeRWWGHByruA1Sc9KO7tM.HnJyF2MzO', 'admin', 3, 2, NULL, 0, '2026-03-16 22:39:53', NULL, '87654321', '987654321'),
(2, 'Nelly', 'nelly@gmail.com', '$2y$10$GqJyixoC9tmOA9VgdeZyBegIEu2TYsd9EPyNJw1HmbeEB38XpMrEK', 'empleado', 4, 0, '2026-03-18 21:28:07', 0, '2026-03-19 02:12:30', NULL, '12345678', '123456789'),
(3, 'Britney', 'britney@gmail.com', '$2y$10$OjMlNdqtFp.J/1Ai3j7x/OdAZILimrCbP8u5faK0ShHy0RHeBSLOC', 'empleado', 1, 0, NULL, 0, '2026-04-15 21:45:55', NULL, NULL, NULL),
(4, 'Pria Torres', 'priat@gmail.com', '$2y$10$tn8ivzR4XWRkH/UlIOpJrOSKjLuyJ0fJOZpSeA9SHn52UV07WQEBy', 'cliente', 0, 0, '2026-05-18 17:57:09', 0, '2026-04-23 04:22:54', NULL, '11223344', '987644321');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id_categoria`);

--
-- Indices de la tabla `codigos_reseteo`
--
ALTER TABLE `codigos_reseteo`
  ADD PRIMARY KEY (`id_codigo`),
  ADD KEY `email` (`email`);

--
-- Indices de la tabla `cupones`
--
ALTER TABLE `cupones`
  ADD PRIMARY KEY (`id_cupon`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `noticias`
--
ALTER TABLE `noticias`
  ADD PRIMARY KEY (`id_noticia`);

--
-- Indices de la tabla `premios_ruleta`
--
ALTER TABLE `premios_ruleta`
  ADD PRIMARY KEY (`id_premio`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id_producto`),
  ADD KEY `id_categoria` (`id_categoria`);

--
-- Indices de la tabla `producto_imagenes`
--
ALTER TABLE `producto_imagenes`
  ADD PRIMARY KEY (`id_imagen`),
  ADD KEY `id_producto` (`id_producto`);

--
-- Indices de la tabla `producto_variantes`
--
ALTER TABLE `producto_variantes`
  ADD PRIMARY KEY (`id_variante`),
  ADD KEY `id_producto` (`id_producto`);

--
-- Indices de la tabla `reservas`
--
ALTER TABLE `reservas`
  ADD PRIMARY KEY (`id_reserva`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `reserva_detalles`
--
ALTER TABLE `reserva_detalles`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `id_reserva` (`id_reserva`),
  ADD KEY `id_cactus` (`id_cactus`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id_categoria` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `codigos_reseteo`
--
ALTER TABLE `codigos_reseteo`
  MODIFY `id_codigo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `cupones`
--
ALTER TABLE `cupones`
  MODIFY `id_cupon` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT de la tabla `noticias`
--
ALTER TABLE `noticias`
  MODIFY `id_noticia` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `premios_ruleta`
--
ALTER TABLE `premios_ruleta`
  MODIFY `id_premio` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `producto_imagenes`
--
ALTER TABLE `producto_imagenes`
  MODIFY `id_imagen` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT de la tabla `producto_variantes`
--
ALTER TABLE `producto_variantes`
  MODIFY `id_variante` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT de la tabla `reservas`
--
ALTER TABLE `reservas`
  MODIFY `id_reserva` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT de la tabla `reserva_detalles`
--
ALTER TABLE `reserva_detalles`
  MODIFY `id_detalle` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `cupones`
--
ALTER TABLE `cupones`
  ADD CONSTRAINT `cupones_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE;

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id_categoria`) ON DELETE SET NULL;

--
-- Filtros para la tabla `producto_imagenes`
--
ALTER TABLE `producto_imagenes`
  ADD CONSTRAINT `producto_imagenes_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE;

--
-- Filtros para la tabla `producto_variantes`
--
ALTER TABLE `producto_variantes`
  ADD CONSTRAINT `producto_variantes_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE;

--
-- Filtros para la tabla `reservas`
--
ALTER TABLE `reservas`
  ADD CONSTRAINT `reservas_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `reserva_detalles`
--
ALTER TABLE `reserva_detalles`
  ADD CONSTRAINT `fk_detalle_reserva` FOREIGN KEY (`id_reserva`) REFERENCES `reservas` (`id_reserva`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_nuevo_producto` FOREIGN KEY (`id_cactus`) REFERENCES `productos` (`id_producto`);

DELIMITER $$
--
-- Eventos
--
CREATE DEFINER=`root`@`localhost` EVENT `limpiar_cupones_caducados` ON SCHEDULE EVERY 1 DAY STARTS '2026-03-16 20:56:17' ON COMPLETION NOT PRESERVE ENABLE DO DELETE FROM cupones WHERE fecha_vencimiento < DATE_SUB(NOW(), INTERVAL 1 DAY)$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
