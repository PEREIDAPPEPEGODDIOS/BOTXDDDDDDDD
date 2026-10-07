const mineflayer = require('mineflayer');

// Escudo global para evitar cierres por errores de chat o red
process.on('uncaughtException', (err) => {
    console.log(`[NPC] Error interno capturado e ignorado: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
    console.log(`[NPC] Promesa rechazada ignorada: ${reason}`);
});

let chatInterval = null;
let moveLoop = null;

function createBot() {
    if (chatInterval) clearInterval(chatInterval);
    if (moveLoop) clearInterval(moveLoop);

    const bot = mineflayer.createBot({
        host: 'logcraft.mcsh.io',
        port: 25565,
        username: 'Bot',
        version: '1.21.4',
        hideErrors: true,
        checkTimeoutInterval: 120 * 1000
    });

    let spawnPos = null;

    bot.on('login', () => {
        console.log('[NPC] Conexión establecida con LogCraft (1.21.4).');
    });

    bot.on('spawn', () => {
        console.log('[NPC] El bot ha aparecido en el Spawn.');
        
        // Guardar la posición central del Spawn al entrar
        spawnPos = bot.entity.position.clone();

        setTimeout(() => {
            bot.chat('/login cubo16');
            
            // Activar movimiento continuo hacia adelante
            bot.setControlState('forward', true);
        }, 3000);
    });

    bot.on('kicked', (reason) => {
        let mensaje = reason;
        try {
            mensaje = JSON.stringify(reason);
        } catch (e) {}
        console.log(`[NPC] Expulsado por el servidor: ${mensaje}`);
    });

    // 1. Anuncio automático en el chat cada 5 minutos
    chatInterval = setInterval(() => {
        if (!bot || !bot.entity) return;

        bot.chat('&b&lDISFRUTA DEL SERVIDOR ?');
        console.log('[NPC] Anuncio enviado al chat.');
    }, 5 * 60 * 1000);

    // 2. Bucle de movimiento PERPETUO dentro del área 7x7 (revisa cada 300 milisegundos)
    moveLoop = setInterval(() => {
        if (!bot || !bot.entity || !spawnPos) return;

        try {
            // Asegurar que nunca deje de caminar hacia adelante
            bot.setControlState('forward', true);

            const distFromSpawn = bot.entity.position.distanceTo(spawnPos);

            // Si está a más de 3.2 bloques del centro (borde de la zona 7x7), gira hacia el centro
            if (distFromSpawn > 3.2) {
                const dx = spawnPos.x - bot.entity.position.x;
                const dz = spawnPos.z - bot.entity.position.z;
                const yaw = Math.atan2(-dx, -dz);
                
                bot.look(yaw, 0, true);

                // Pequeño salto automático para desatascarse en los bordes
                if (Math.random() > 0.5) {
                    bot.setControlState('jump', true);
                    setTimeout(() => { if (bot) bot.setControlState('jump', false); }, 250);
                }
            } else {
                // Si está dentro de la zona, va variando su ángulo aleatoriamente mientras camina
                if (Math.random() > 0.75) {
                    const currentYaw = bot.entity.yaw;
                    const cambioYaw = (Math.random() - 0.5) * 1.2;
                    bot.look(currentYaw + cambioYaw, 0, true);
                }

                // Salto ocasional mientras camina
                if (Math.random() > 0.9) {
                    bot.setControlState('jump', true);
                    setTimeout(() => { if (bot) bot.setControlState('jump', false); }, 250);
                }
            }

            // Mover la mano continuamente
            if (Math.random() > 0.6) {
                bot.swingArm('right');
            }

        } catch (err) {
            console.log(`[NPC] Aviso en bucle de movimiento: ${err.message}`);
        }
    }, 300);

    // Auto-reconexión si el servidor se reinicia o cae la red
    bot.on('end', (reason) => {
        if (chatInterval) clearInterval(chatInterval);
        if (moveLoop) clearInterval(moveLoop);
        console.log(`[NPC] Conexión cerrada (${reason}). Reconectando en 3 segundos...`);
        setTimeout(createBot, 3000);
    });

    bot.on('error', (err) => {
        console.log(`[NPC] Error de red: ${err.message}`);
    });
}

createBot();
