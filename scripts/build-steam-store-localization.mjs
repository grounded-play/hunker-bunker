#!/usr/bin/env node
/**
 * Generate Steamworks store-page localization uploads.
 *
 *   node scripts/build-steam-store-localization.mjs
 *
 * Steamworks exports one JSON per language from the store-page editor and takes
 * the same shape back on upload. Only English comes back populated; every other
 * language exports as a bare {itemid, language} stub for you to fill.
 *
 * The store copy is BBCode with image tokens in it, so the localized bodies are
 * NOT hand-written per language -- one template is assembled here from
 * translated text fragments. That way a missing [/p] or a mangled
 * {STEAM_APP_IMAGE} token cannot appear in one language and not another, which
 * is exactly the kind of thing nobody notices until the Russian store page
 * renders raw markup.
 *
 * English is deliberately NOT regenerated: the exported english file is the
 * live store copy and stays the source of truth.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'steam/store/localization');
const APP_ID = '1247290';

// MIT licence text is legally authoritative in English and is not translated --
// a localized licence is a different licence. Lifted verbatim from the English
// export so the field round-trips unchanged.
const english = JSON.parse(
    readFileSync(join(OUT_DIR, `storepage_${APP_ID}_english.json`), 'utf8')
);
const LEGAL = english['app[content][legal]'];

const T = {
    russian: {
        tagline: 'ретрофутуристическая тактическая игра на выживание: вы ведёте отряд через меняющийся подземный бункер, собираете трофеи и не даёте погаснуть свету, когда тьма начинает наступать.',
        operators: 'Под вашим командованием три оператора-специалиста:',
        scout: 'Разведчик — быстрая разведка и широкий охват при сборе трофеев.',
        tank: 'Тяжеловес — прочная оборона и выживание на передовой.',
        engineer: 'Инженер — перенаправление систем, работа с терминалами и тактическая поддержка.',
        run1: 'Каждый забег уводит вас глубже в процедурные коридоры бункера, враждебные биомы и разрушенную инфраструктуру.',
        run2: 'Следите за кислородом, добывайте ресурсы, чините критические системы и решайте, за какие угрозы стоит браться, когда припасов в обрез.',
        featuresHeading: 'Особенности',
        features: [
            'Процедурно генерируемые забеги по бункеру с меняющейся планировкой и нарастающим давлением.',
            'Три непохожих класса операторов с разной подвижностью, способностями и боевой ролью.',
            'Управление кислородом и трофеями, вознаграждающее продуманный маршрут.',
            'Терминалы, записи, статьи кодекса, лагеря и тайны фракций, которые нужно найти.',
            'Несколько концовок, отражающих ваши решения и то, кто из отряда выжил.',
            'Поддержка клавиатуры и мыши, удобный для касаний интерфейс и переназначаемое управление.'
        ],
        closing1: 'Не все тайны Hunker Bunker заперты на ключ.',
        closing2: 'Некоторые заперты ценой того, чтобы прожить достаточно долго и задать правильный вопрос',
        short: 'Ведите отряд операторов через тёмный кибернетический бункер. Следите за кислородом, укрепляйте оборону против мутирующих кибер-улиток и раскрывайте тайны глубинных биомов в напряжённой тактической игре на выживание.',
        sys: { win: 'Windows 10, 64-бит', cpu: 'Intel Core i3 или AMD Ryzen 3', gpu: 'Видеокарта с поддержкой WebGL и актуальными драйверами', snd: 'Любое стандартное аудиоустройство', note: 'Требуется современная видеокарта, стабильно тянущая Chromium/WebGL.',
                lin: 'SteamOS 3.x или Ubuntu 22.04 LTS', lcpu: '64-битный процессор', lgpu: 'Видеокарта с поддержкой OpenGL/Vulkan и актуальными драйверами', lnote: 'Steam Deck — основная цель на Linux.' },
        filters: ['Избранное', 'Ключи']
    },
    sc_schinese: {
        tagline: '是一款复古未来主义战术生存游戏：带领小队穿行于不断变化的地下地堡，搜刮残骸，并在黑暗重新逼近时守住灯火。',
        operators: '你将指挥三名专业操作员：',
        scout: '侦察兵 —— 快速侦查与大范围回收。',
        tank: '重装兵 —— 重型防御与前线生存。',
        engineer: '工程兵 —— 系统改道、终端作业与战术支援。',
        run1: '每一次出击都会把你推向更深处：程序生成的地堡走廊、充满敌意的生物群系与崩坏的基础设施。',
        run2: '管理氧气、回收资源、修复关键系统，并在补给见底时决定哪些威胁值得一战。',
        featuresHeading: '特色',
        features: [
            '程序生成的地堡征程，布局不断变化，压力逐步升级。',
            '三种截然不同的操作员职业，各有独特的移动方式、能力与战斗定位。',
            '奖励缜密路线规划的氧气与回收管理。',
            '可发掘的终端、传说日志、图鉴条目、营地与派系秘密。',
            '多种结局，反映你的抉择以及队员的存亡。',
            '支持键鼠、适配触控的界面，以及可自定义的按键映射。',
        ],
        closing1: 'Hunker Bunker 中的某些秘密并非锁在钥匙之后。',
        closing2: '它们锁在「活得够久、问对问题」所需付出的代价之后',
        short: '带领你的操作员小队穿越黑暗的网格化赛博地堡。管理氧气，加固防御以对抗不断变异的赛博蜗牛，并在这款高张力战术生存游戏中揭开深层生物群系的传说。',
        sys: { win: 'Windows 10 64 位', cpu: 'Intel Core i3 或 AMD Ryzen 3', gpu: '支持 WebGL 的显卡，并安装最新驱动', snd: '任意标准音频设备', note: '需要能够稳定运行 Chromium/WebGL 的现代显卡。',
                lin: 'SteamOS 3.x 或 Ubuntu 22.04 LTS', lcpu: '64 位处理器', lgpu: '支持 OpenGL/Vulkan 的显卡，并安装最新驱动', lnote: 'Steam Deck 是主要的 Linux 目标平台。' },
        filters: ['精选', '钥匙']
    },
    german: {
        tagline: 'ist ein retrofuturistisches taktisches Survival-Spiel: Führe einen Trupp durch einen sich verschiebenden unterirdischen Bunker, birg Verwertbares und halte das Licht am Brennen, wenn die Dunkelheit zurückdrängt.',
        operators: 'Du befehligst drei spezialisierte Operatoren:',
        scout: 'Späher für schnelle Aufklärung und weite Bergungsreichweite.',
        tank: 'Panzer für schwere Verteidigung und das Überleben an vorderster Front.',
        engineer: 'Ingenieur für das Umleiten von Systemen, Terminalarbeit und taktischen Nutzen.',
        run1: 'Jeder Durchlauf treibt dich tiefer in prozedurale Bunkerkorridore, feindselige Biome und zerstörte Infrastruktur.',
        run2: 'Verwalte Sauerstoff, birg Ressourcen, repariere kritische Systeme und entscheide, welche Bedrohungen einen Kampf wert sind, wenn der Nachschub knapp wird.',
        featuresHeading: 'Features',
        features: [
            'Prozedural erzeugte Bunkerdurchläufe mit wechselnden Layouts und steigendem Druck.',
            'Klar unterschiedene Operatorklassen mit eigener Bewegung, eigenen Fähigkeiten und Kampfrollen.',
            'Sauerstoff- und Bergungsmanagement, das sorgfältige Routenplanung belohnt.',
            'Auffindbare Terminals, Lore-Logs, Kodexeinträge, Lager und Fraktionsgeheimnisse.',
            'Mehrere Enden, die deine Entscheidungen und das Überleben deiner Crew widerspiegeln.',
            'Tastatur-/Maussteuerung, touchfreundliche UI und frei belegbare Steuerung.'
        ],
        closing1: 'Manche Geheimnisse in Hunker Bunker liegen nicht hinter Schlüsseln.',
        closing2: 'Sie liegen hinter dem Preis, lange genug zu überleben, um die richtigen Fragen zu stellen',
        short: 'Führe deinen Trupp Operatoren durch einen dunklen, rasterbasierten kybernetischen Bunker. Verwalte Sauerstoff, verstärke die Abwehr gegen mutierende Cyberschnecken und enthülle die Geschichte der tiefen Biome in diesem hochgespannten taktischen Survival-Spiel.',
        sys: { win: 'Windows 10 64-Bit', cpu: 'Intel Core i3 oder AMD Ryzen 3', gpu: 'WebGL-fähige GPU mit aktuellen Treibern', snd: 'Beliebiges Standard-Audiogerät', note: 'Erfordert eine moderne GPU, die Chromium/WebGL zuverlässig ausführt.',
                lin: 'SteamOS 3.x oder Ubuntu 22.04 LTS', lcpu: '64-Bit-CPU', lgpu: 'OpenGL-/Vulkan-fähige GPU mit aktuellen Treibern', lnote: 'Das Steam Deck ist das primäre Linux-Ziel.' },
        filters: ['Empfohlen', 'Schlüssel']
    },
    japanese: {
        tagline: 'は、レトロフューチャーな戦術サバイバルゲーム。変化し続ける地下バンカーへ分隊を導き、資材を回収し、闇が押し返してくる中で灯りを守り抜く。',
        operators: '指揮下には3名の専門オペレーターがいる：',
        scout: 'スカウト — 高速な偵察と広範囲の回収。',
        tank: 'タンク — 重装防御と前線での生存。',
        engineer: 'エンジニア — 系統の再配線、端末操作、戦術支援。',
        run1: '出撃のたびに、手続き生成されるバンカーの通路、敵対的なバイオーム、崩れたインフラの奥へと進むことになる。',
        run2: '酸素を管理し、資源を回収し、重要系統を修復し、物資が尽きかけたときにどの脅威と戦う価値があるかを見極めろ。',
        featuresHeading: '特徴',
        features: [
            '構造が変化し、圧力が高まり続ける手続き生成のバンカー探索。',
            '移動・能力・戦闘での役割が異なる、明確に差別化された3つのオペレータークラス。',
            '綿密なルート設計が報われる酸素と回収の管理。',
            '発見できる端末、ロアログ、コーデックス、野営地、派閥の秘密。',
            '選択と分隊の生死を映し出す複数のエンディング。',
            'キーボード／マウス対応、タッチに適したUI、再割り当て可能な操作。'
        ],
        closing1: 'Hunker Bunker の秘密のいくつかは、鍵の向こうにあるのではない。',
        closing2: '正しい問いを立てられるまで生き延びる、その代価の向こうにある',
        short: '暗いグリッド状のサイバネティック・バンカーへオペレーター分隊を導け。酸素を管理し、変異するサイバースネイルに備えて防御を固め、深層バイオームのロアを解き明かす高緊張の戦術サバイバル。',
        sys: { win: 'Windows 10 64-bit', cpu: 'Intel Core i3 または AMD Ryzen 3', gpu: 'WebGL対応GPU（最新ドライバー）', snd: '標準的なオーディオデバイス', note: 'Chromium/WebGL を安定して動作させられる最新のGPUが必要です。',
                lin: 'SteamOS 3.x または Ubuntu 22.04 LTS', lcpu: '64ビットCPU', lgpu: 'OpenGL/Vulkan対応GPU（最新ドライバー）', lnote: 'Steam Deck が主要なLinuxターゲットです。' },
        filters: ['注目', 'キー']
    },
    brazilian: {
        tagline: 'é um jogo de sobrevivência tática retrofuturista sobre conduzir um esquadrão por um búnquer subterrâneo em constante mudança, recolher sucata e manter as luzes acesas quando o escuro começa a avançar de volta.',
        operators: 'Você comanda três operadores especialistas:',
        scout: 'Batedor para reconhecimento rápido e ampla cobertura de coleta.',
        tank: 'Tanque para defesa pesada e sobrevivência na linha de frente.',
        engineer: 'Engenheiro para redirecionar sistemas, operar terminais e dar utilidade tática.',
        run1: 'Cada incursão empurra você mais fundo em corredores procedurais do búnquer, biomas hostis e infraestrutura destruída.',
        run2: 'Gerencie oxigênio, recupere recursos, conserte sistemas críticos e decida quais ameaças valem a luta quando os suprimentos ficam escassos.',
        featuresHeading: 'Recursos',
        features: [
            'Incursões geradas proceduralmente, com layouts mutáveis e pressão crescente.',
            'Classes de operador bem distintas, com movimentação, habilidades e papéis de combate próprios.',
            'Gestão de oxigênio e sucata que recompensa planejamento de rota cuidadoso.',
            'Terminais, registros de lore, entradas de códex, acampamentos e segredos de facção para descobrir.',
            'Múltiplos finais que refletem suas escolhas e a sobrevivência da sua equipe.',
            'Suporte a teclado/mouse, interface amigável ao toque e controles remapeáveis.'
        ],
        closing1: 'Alguns segredos de Hunker Bunker não estão trancados atrás de chaves.',
        closing2: 'Estão trancados atrás do custo de sobreviver tempo suficiente para fazer as perguntas certas',
        short: 'Conduza seu esquadrão de operadores por um búnquer cibernético escuro e em grade. Gerencie oxigênio, reforce defesas contra ciber-caracóis em mutação e desvende a lore dos biomas profundos neste tenso jogo de sobrevivência tática.',
        sys: { win: 'Windows 10 64 bits', cpu: 'Intel Core i3 ou AMD Ryzen 3', gpu: 'GPU compatível com WebGL e drivers atualizados', snd: 'Qualquer dispositivo de áudio padrão', note: 'Requer uma GPU moderna capaz de rodar Chromium/WebGL de forma confiável.',
                lin: 'SteamOS 3.x ou Ubuntu 22.04 LTS', lcpu: 'CPU de 64 bits', lgpu: 'GPU compatível com OpenGL/Vulkan e drivers atualizados', lnote: 'O Steam Deck é o alvo Linux principal.' },
        filters: ['Destaques', 'Chaves']
    }
};

// Spain and Latin America take the same copy: the store text has no regional
// divergence, and leaving the Spain tab empty renders the page in English there.
T.latam = {
    tagline: 'es un juego de supervivencia táctica retrofuturista sobre guiar a un escuadrón por un búnker subterráneo cambiante, recoger chatarra y mantener las luces encendidas cuando la oscuridad empieza a avanzar de nuevo.',
    operators: 'Comandas a tres operadores especialistas:',
    scout: 'Explorador para reconocimiento rápido y amplia cobertura de recolección.',
    tank: 'Tanque para defensa pesada y supervivencia en primera línea.',
    engineer: 'Ingeniero para redirigir sistemas, operar terminales y aportar utilidad táctica.',
    run1: 'Cada partida te empuja más adentro de corredores procedurales del búnker, biomas hostiles e infraestructura destruida.',
    run2: 'Administra el oxígeno, recupera recursos, repara sistemas críticos y decide qué amenazas valen la pelea cuando escasean los suministros.',
    featuresHeading: 'Características',
    features: [
        'Partidas de búnker generadas proceduralmente, con diseños cambiantes y presión creciente.',
        'Clases de operador bien diferenciadas, con movimiento, habilidades y roles de combate propios.',
        'Gestión de oxígeno y chatarra que recompensa la planificación cuidadosa de rutas.',
        'Terminales, registros de lore, entradas de códex, campamentos y secretos de facción por descubrir.',
        'Múltiples finales que reflejan tus decisiones y la supervivencia de tu tripulación.',
        'Soporte de teclado/ratón, interfaz apta para pantallas táctiles y controles reasignables.'
    ],
    closing1: 'Algunos secretos de Hunker Bunker no están guardados tras una llave.',
    closing2: 'Están guardados tras el costo de sobrevivir lo suficiente para hacer las preguntas correctas',
    short: 'Guía a tu escuadrón de operadores por un oscuro búnker cibernético basado en cuadrícula. Administra el oxígeno, refuerza las defensas contra cibercaracoles mutantes y descubre la historia de los biomas profundos en este tenso juego de supervivencia táctica.',
    sys: { win: 'Windows 10 de 64 bits', cpu: 'Intel Core i3 o AMD Ryzen 3', gpu: 'GPU compatible con WebGL y controladores actualizados', snd: 'Cualquier dispositivo de audio estándar', note: 'Requiere una GPU moderna capaz de ejecutar Chromium/WebGL de forma fiable.',
            lin: 'SteamOS 3.x o Ubuntu 22.04 LTS', lcpu: 'CPU de 64 bits', lgpu: 'GPU compatible con OpenGL/Vulkan y controladores actualizados', lnote: 'Steam Deck es el objetivo principal en Linux.' },
    filters: ['Destacados', 'Llaves']
};
T.spanish = T.latam;

/** Assemble the store body. One template, so the BBCode is identical everywhere. */
function buildAbout(t) {
    const bullet = (text) => `[*][p]${text}\r\n[/p][/*]`;
    return [
        `[p][b]HUNKER BUNKER[/b] ${t.tagline}`,
        `[/p][p]\r\n[/p][p]${t.operators}`,
        `[/p][list]${bullet(`[b]${t.scout.split(' ')[0]}[/b]${t.scout.slice(t.scout.split(' ')[0].length)}`)}`,
        `${bullet(`[b]${t.tank.split(' ')[0]}[/b]${t.tank.slice(t.tank.split(' ')[0].length)}`)}`,
        `${bullet(`[b]${t.engineer.split(' ')[0]}[/b]${t.engineer.slice(t.engineer.split(' ')[0].length)}`)}[/list][p]\r\n`,
        `[/p][p]${t.run1}\r\n`,
        `[/p][p]${t.run2}[/p][p][/p][p][img src="{STEAM_APP_IMAGE}/extras/eng.intro"][/img]\r\n`,
        `[/p][p]\r\n[/p][p][b]${t.featuresHeading}[/b]\r\n`,
        `[/p][list]${t.features.map(bullet).join('')}[/list][p]\r\n`,
        `[/p][p]${t.closing1}\r\n`,
        `[/p][p][b]${t.closing2}[/b].[/p][p][/p][p][img src="{STEAM_APP_IMAGE}/extras/scout.intro"][/img]\r\n[/p]`
    ].join('');
}

let written = 0;
for (const [language, t] of Object.entries(T)) {
    const payload = {
        itemid: APP_ID,
        language,
        'app[content][legal]': LEGAL,
        'app[content][about]': buildAbout(t),
        'app[content][short_description]': t.short,
        'app[content][sysreqs][windows][min][osversion]': t.sys.win,
        'app[content][sysreqs][windows][min][processor]': t.sys.cpu,
        'app[content][sysreqs][windows][min][graphics]': t.sys.gpu,
        'app[content][sysreqs][windows][min][soundcard]': t.sys.snd,
        'app[content][sysreqs][windows][min][notes]': t.sys.note,
        'app[content][sysreqs][linux][min][osversion]': t.sys.lin,
        'app[content][sysreqs][linux][min][processor]': t.sys.lcpu,
        'app[content][sysreqs][linux][min][graphics]': t.sys.lgpu,
        'app[content][sysreqs][linux][min][soundcard]': t.sys.snd,
        'app[content][sysreqs][linux][min][notes]': t.sys.lnote,
        'app[item_store][filters][0][localization]': t.filters[0],
        'app[item_store][filters][1][localization]': t.filters[1]
    };
    writeFileSync(
        join(OUT_DIR, `storepage_${APP_ID}_${language}.json`),
        JSON.stringify(payload)
    );
    written += 1;
}

console.log(`wrote ${written} localized store pages to steam/store/localization/`);
for (const f of readdirSync(OUT_DIR).sort()) {
    const size = readFileSync(join(OUT_DIR, f), 'utf8').length;
    console.log(`  ${f.padEnd(42)} ${String(size).padStart(6)} bytes`);
}
