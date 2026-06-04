import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Moka {
  private clicksSeguidos = 0;
  private haSaludado = false;
  private resetClickTimer: any;

  public eventoMoka$ = new Subject<{texto: string, imagen: string, mantener: boolean}>();

  public passwordVisible: boolean = false;

  public interactuarAuth(): { texto: string, imagen: string, castigo: boolean } {
    if (this.passwordVisible) {
        return { texto: "¡No insistas, sigo con los ojos cerrados! Tu contraseña está a salvo.", imagen: 'barista_cara_cubierta.png', castigo: false };
    }
    const frasesAuth = [
        "Tus datos están protegidos en nuestro invernadero virtual.",
        "Una buena contraseña es como un cactus: ¡Difícil de vulnerar sin pincharse!",
        "Asegúrate de no compartir tu contraseña con nadie. ¡Ni siquiera conmigo!",
        "La seguridad es lo primero. ¡Estoy vigilando que nadie vea tu pantalla!"
    ];
    const elegido = frasesAuth[Math.floor(Math.random() * frasesAuth.length)];
    return { texto: elegido, imagen: 'barista_emocionada.png', castigo: false };
  }

  public dispararEvento(texto: string, imagen: string, mantener: boolean = false) {
      this.eventoMoka$.next({texto, imagen, mantener});
  }

  private dialogosUsados: Record<string, string[]> = {
    bienvenida: [], normal: [], incomodidad: [], molesta_formal: [],
    paciencia_agotada: [], enojada_informal: [], datos_curiosos: [], 
    recomendacion_producto: [], aburrimiento: [], seguridad: []
  };

  private dialogos = {
    bienvenida: [
        "¡Bienvenido al Oasis! ¿Te apetece un Latte o prefieres ver las suculentas?",
        "¡Hola! Qué gusto verte por aquí. Tómate tu tiempo para explorar el museo.",
        "¡Oh, una visita! Pasa, tenemos el mejor café del VRAEM y las plantas más bonitas de Ayacucho.",
        "¡Hola, hola! Si buscas un compañero con espinas, estás en el lugar correcto."
    ],
    normal: [
        "El clima de Ayacucho es ideal para nosotros, ¿verdad?",
        "El aroma a café recién molido y tierra húmeda es la mejor combinación del mundo.",
        "Muchos vienen a la cafetería solo para relajarse. El verde de las plantas ayuda muchísimo.",
        "A veces me quedo mirando los cactus y me olvido de preparar los pedidos... no le digas al jefe.",
        "Si necesitas ayuda para elegir un recuerdo, ¡avísame! Soy experta en la materia.",
        "Cuidar una planta es como cuidar una amistad, requiere paciencia y no ahogarla."
    ],
    incomodidad: [
        "Eh... disculpa, me haces cosquillas con el cursor.",
        "Estaba a punto de decir algo importante, ¿sabes?",
        "Oye, tranquilo con los clics...",
        "Me desconcentras si me pinchas tanto."
    ],
    molesta_formal: [
        "Por favor, permíteme terminar de hablar.",
        "El Jefe dice que el cliente siempre tiene la razón, pero estás poniendo a prueba mi paciencia.",
        "¿Se te trabó el mouse o lo haces a propósito?",
        "Como barista te exijo un poco de espacio personal virtual."
    ],
    paciencia_agotada: [
        "Ah, genial. Sigue haciendo clic, seguro así te atiendo más rápido.",
        "Hacer clic compulsivamente no hará que tu café se prepare por arte de magia.",
        "Estoy a un clic de darte café descafeinado por el resto de tu vida."
    ],
    enojada_informal: [
        "¡Ya basta! ¡Me estás sacando de quicio!",
        "¡Una interrupción más y le digo al Jefe que te cobre doble!",
        "¡Mis hojas se están marchitando del estrés que me das!"
    ],
    datos_curiosos: [
        "Dato curioso: Algunos cactus pueden vivir más de 100 años. ¡Tienen más experiencia que nosotros!",
        "¿Sabías que las espinas de los cactus son en realidad hojas modificadas para no perder agua?",
        "La simetría de estas plantas es perfecta para practicar dibujo anatómico y perspectiva.",
        "A veces le pongo nombres a los cactus de la exhibición. Al más grande le digo 'Señor Pinchos'."
    ],
    recomendacion_producto: [
        "¡Esa es una excelente elección!",
        "¡Oh! Ese quedaría perfecto en una repisa, justo al lado de tu colección favorita.",
        "Me encanta ese diseño, tiene un estilo muy estético y único.",
        "¡Llévalo! Te juro que es de los más populares de la tienda."
    ],
    aburrimiento: [
        "Qué aburrimiento... ¿ni una mosca para espantar por aquí?",
        "Si esto sigue así, me voy a poner a contar las espinas de ese cactus verde.",
        "Oye... ¿Aún sigues ahí o dejaste la pestaña abierta para escuchar la música?",
        "Creo que aprovecharé este silencio para limpiar la máquina de espresso... por quinta vez."
    ],
    seguridad: [
        "¡Uy! La seguridad es primero. Me tapo los ojos para no ver tu contraseña.",
        "Tus datos son súper sensibles. ¡Yo no miraré nada, te lo prometo!",
        "Una buena contraseña es como un cactus: ¡Difícil de vulnerar sin pincharse!",
        "¡Secreto de sumario! Cuidar tus datos es tan importante como regar las plantas."
    ]
  };

  private obtenerFraseAleatoria(categoria: keyof typeof this.dialogos): string {
    const opciones = this.dialogos[categoria];
    if (this.dialogosUsados[categoria].length === opciones.length) {
        this.dialogosUsados[categoria] = []; 
    }
    
    const disponibles = opciones.filter(frase => !this.dialogosUsados[categoria].includes(frase));
    const elegido = disponibles[Math.floor(Math.random() * disponibles.length)];
    this.dialogosUsados[categoria].push(elegido);
    
    return elegido;
  }

  public interactuar(): { texto: string, imagen: string, castigo: boolean } {
    this.clicksSeguidos++;
    
    clearTimeout(this.resetClickTimer);
    this.resetClickTimer = setTimeout(() => { this.clicksSeguidos = 0; }, 3000);

    if (!this.haSaludado) {
        this.haSaludado = true;
        return { texto: this.obtenerFraseAleatoria('bienvenida'), imagen: 'barista_saludando.png', castigo: false };
    }

    if (this.clicksSeguidos === 1) {
        const esDato = Math.random() > 0.7;
        return { 
            texto: this.obtenerFraseAleatoria(esDato ? 'datos_curiosos' : 'normal'), 
            imagen: esDato ? 'barista_emocionada.png' : 'barista_feliz.png',
            castigo: false 
        };
    } else if (this.clicksSeguidos === 2) {
        return { texto: this.obtenerFraseAleatoria('incomodidad'), imagen: 'barista_incomoda.png', castigo: false };
    } else if (this.clicksSeguidos === 3) {
        return { texto: this.obtenerFraseAleatoria('molesta_formal'), imagen: 'barista_en_alerta.png', castigo: false };
    } else if (this.clicksSeguidos === 4) {
        return { texto: this.obtenerFraseAleatoria('paciencia_agotada'), imagen: 'barista_en_alerta2.png', castigo: false };
    } else {
        this.clicksSeguidos = 0; 
        return { texto: this.obtenerFraseAleatoria('enojada_informal'), imagen: 'barista_sad2.png', castigo: true };
    }
  }

  public obtenerAburrimiento(): { texto: string, imagen: string } {
    return { texto: this.obtenerFraseAleatoria('aburrimiento'), imagen: 'barista_aburrida.png' };
  }

  public reaccionarPassword(visible: boolean): { texto: string, imagen: string } {
    if (visible) {
        return { texto: this.obtenerFraseAleatoria('seguridad'), imagen: 'barista_cara_cubierta.png' };
    } else {
        return { texto: "¡Listo! Ya puedes seguir escribiendo tranquilo.", imagen: 'barista_feliz.png' };
    }
  }
}