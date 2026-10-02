/**
 * Mandatory local chat baseline, maintained alongside its collision fixtures.
 * All seven dictionaries are always combined, regardless of the UI language.
 * This is a curated lexical baseline, not a claim of complete language coverage.
 * Add native-speaker-reviewed inflections/slang together with benign examples.
 *
 * `words` require boundaries: do not censor Scunthorpe, Dickinson, assistant,
 * or Japanese やくそく. `phrases` are distinctive Han/Kana expressions which
 * also need to match inside sentences written without spaces. Avoid ambiguous
 * single characters (操, 性) and broad syllables as substring rules.
 */
export const CHAT_FILTER_TERMS = Object.freeze({
    en: Object.freeze({
        words: Object.freeze([
            'fuck', 'fucks', 'fucked', 'fucker', 'fuckers', 'fucking',
            'motherfucker', 'motherfuckers', 'motherfucking',
            'shit', 'shits', 'shitty', 'bullshit', 'shithead', 'shitheads',
            'bitch', 'bitches', 'bastard', 'bastards', 'cunt', 'cunts',
            'ass', 'asshole', 'assholes', 'arsehole', 'arseholes', 'damn',
            'dick', 'dicks', 'cock', 'cocks', 'pussy', 'pussies',
            'sex', 'sexual', 'porn', 'porno', 'pornography', 'penis',
            'vagina', 'vaginas', 'anal', 'blowjob', 'blowjobs', 'cum', 'semen'
        ]),
        phrases: Object.freeze([])
    }),
    de: Object.freeze({
        words: Object.freeze([
            'scheiße', 'scheisse', 'scheiß', 'scheiss', 'scheißkerl',
            'fick', 'ficken', 'fickt', 'gefickt', 'ficker',
            'arschloch', 'arschlöcher', 'arschloecher', 'hurensohn',
            'hurensöhne', 'fotze', 'fotzen', 'wichser', 'wichsen',
            'pornografie', 'pornographie', 'geschlechtsverkehr', 'schlampe'
        ]),
        phrases: Object.freeze([])
    }),
    'es-419': Object.freeze({
        words: Object.freeze([
            'mierda', 'mierdas', 'joder', 'jodido', 'jodida',
            'puta', 'putas', 'puto', 'putos', 'putamadre',
            'cabrón', 'cabron', 'cabrona', 'cabrones', 'coño',
            'pendejo', 'pendeja', 'pendejos', 'pendejas', 'verga',
            'chingar', 'chinga', 'chingada', 'chingado', 'chingados',
            'sexo', 'pornografía', 'pornografia', 'pene'
        ]),
        phrases: Object.freeze([])
    }),
    ja: Object.freeze({
        words: Object.freeze(['くそ', 'クソ', 'ばか', 'バカ', 'アホ']),
        phrases: Object.freeze([
            'くそったれ', 'クソッタレ', 'くそ野郎', 'クソ野郎',
            'ファック', 'セックス', 'せっくす', 'ポルノ',
            'ちんこ', 'チンコ', 'ちんぽ', 'チンポ', 'まんこ', 'マンコ',
            '性交', '陰茎', '陰部'
        ])
    }),
    'pt-BR': Object.freeze({
        words: Object.freeze([
            'merda', 'merdas', 'porra', 'caralho', 'caralhos',
            'foda', 'foder', 'fodase', 'foda-se', 'fodido', 'fodida',
            'buceta', 'bucetas', 'punheta', 'punhetas', 'puta', 'puto',
            'sexo', 'pornô', 'porno', 'pornografia', 'pênis', 'penis',
            'vagina', 'vaginas', 'gozar'
        ]),
        phrases: Object.freeze([])
    }),
    ru: Object.freeze({
        words: Object.freeze([
            'блядь', 'блять', 'бля', 'бляди', 'сука', 'суки', 'сучка',
            'хуй', 'хуя', 'хуи', 'хуйня', 'хрен', 'пизда', 'пиздец',
            'пизду', 'ебать', 'ебаный', 'ебаный', 'ебанутый', 'ёбаный',
            'ёб', 'ебу', 'нахуй', 'идиот', 'дерьмо', 'гандон',
            'секс', 'порно', 'порнография', 'пенис', 'вагина', 'сперма'
        ]),
        phrases: Object.freeze([])
    }),
    'zh-CN': Object.freeze({
        words: Object.freeze(['妈的', '屌']),
        phrases: Object.freeze([
            '傻逼', '傻屄', '傻叉', '他妈的', '他媽的', '操你妈',
            '操你媽', '肏你妈', '肏你媽', '狗日的', '王八蛋', '混蛋',
            '性爱', '性愛', '性交', '色情', '阴茎', '陰莖',
            '阴道', '陰道', '鸡巴', '雞巴'
        ])
    })
});

export const CHAT_FILTER_LOCALES = Object.freeze(Object.keys(CHAT_FILTER_TERMS));
