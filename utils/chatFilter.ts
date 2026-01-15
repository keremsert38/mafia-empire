/**
 * Chat Content Filter / Sohbet İçerik Filtresi
 * 
 * Bu modül, chat mesajlarında küfür, argo ve cinsel içerikli kelimeleri tespit eder.
 * Türkçe ve İngilizce kelimeler dahildir.
 */

// Türkçe yasaklı kelimeler (küfür, argo, cinsel içerik)
const TURKISH_BANNED_WORDS = [
    // Küfür
    'amk', 'aq', 'mk', 'amına', 'amina', 'ananı', 'anani', 'orospu', 'piç', 'pic',
    'siktir', 'siktirgit', 'sikeyim', 'sikerim', 'sik', 'yarrak', 'yarrağ', 'yarrag',
    'taşak', 'tasak', 'göt', 'got', 'götün', 'gotun', 'ibne', 'pezevenk', 'kahpe',
    'gavat', 'salak', 'gerizekalı', 'gerizekali', 'mal', 'aptal', 'dangalak',
    'hıyar', 'hiyar', 'puşt', 'pust', 'döl', 'dol', 'meme', 'kaltak', 'fahişe',
    'fahise', 'oç', 'oc', 'amcık', 'amcik', 'yavşak', 'yavsak', 'şerefsiz',
    'serefsiz', 'namussuz', 'bok', 'boktan', 'osur', 'zıkkım', 'zikkim',
    // Argo
    'lan', 'ulan', 'be', 'hadi', 'lanet', 'kahretsin', 'hassiktir', 'hass',
    // Cinsel içerik
    'seks', 'sex', 'porno', 'porn', 'erotik', 'erotic', 'nude', 'çıplak', 'ciplak',
    'oral', 'anal', 'mastürbasyon', 'masturbasyon', 'orgazm', 'orgasm', 'vajina',
    'penis', 'dildo', 'vibratör', 'vibrator', 'fetish', 'fetiş', 'bdsm',
];

// İngilizce yasaklı kelimeler
const ENGLISH_BANNED_WORDS = [
    // Profanity
    'fuck', 'fucking', 'fucker', 'fucked', 'fck', 'f*ck', 'f**k',
    'shit', 'sh*t', 'bullshit', 'shitty', 'shitting',
    'bitch', 'b*tch', 'bitches', 'bitching',
    'ass', 'asshole', 'a**hole', 'arse', 'arsehole',
    'dick', 'd*ck', 'dickhead', 'dicks',
    'cock', 'c*ck', 'cocks', 'cocksucker',
    'pussy', 'p*ssy', 'pussies',
    'cunt', 'c*nt', 'cunts',
    'bastard', 'b*stard',
    'damn', 'dammit', 'goddamn',
    'hell', 'wtf', 'stfu', 'gtfo',
    'whore', 'slut', 'hoe', 'hooker', 'prostitute',
    'nigger', 'nigga', 'n*gger', 'n*gga',
    'faggot', 'fag', 'f*ggot', 'f*g',
    'retard', 'retarded', 'idiot', 'moron', 'dumbass',
    // Sexual content
    'porn', 'porno', 'pornography', 'xxx', 'nsfw',
    'nude', 'nudes', 'naked',
    'sex', 'sexy', 'sexual', 'sexuality',
    'masturbate', 'masturbation', 'jerk', 'jerking',
    'orgasm', 'cum', 'cumming', 'cumshot',
    'blowjob', 'bj', 'handjob', 'rimjob',
    'dildo', 'vibrator', 'fetish', 'bdsm', 'bondage',
    'erotic', 'erotica', 'aroused', 'horny',
];

// Tüm yasaklı kelimeler (küçük harfe çevrilmiş)
const ALL_BANNED_WORDS = [
    ...TURKISH_BANNED_WORDS,
    ...ENGLISH_BANNED_WORDS,
].map(word => word.toLowerCase());

/**
 * Mesajda yasaklı kelime olup olmadığını kontrol eder
 * @param message Kontrol edilecek mesaj
 * @returns Yasaklı kelime varsa true, yoksa false
 */
export function containsBannedWord(message: string): boolean {
    if (!message || typeof message !== 'string') {
        return false;
    }

    // Mesajı küçük harfe çevir ve normalize et
    const normalizedMessage = message
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Aksanları kaldır
        .replace(/[*@#$%^&()_+=\[\]{}|\\:";'<>,.?\/~`!]/g, '') // Özel karakterleri kaldır
        .replace(/0/g, 'o') // Leet speak dönüşümleri
        .replace(/1/g, 'i')
        .replace(/3/g, 'e')
        .replace(/4/g, 'a')
        .replace(/5/g, 's')
        .replace(/7/g, 't')
        .replace(/8/g, 'b');

    // Kelime bazlı kontrol
    const words = normalizedMessage.split(/\s+/);

    for (const word of words) {
        // Tam eşleşme
        if (ALL_BANNED_WORDS.includes(word)) {
            return true;
        }

        // Kelime içinde geçiyor mu (3+ karakter kelimeler için)
        for (const bannedWord of ALL_BANNED_WORDS) {
            if (bannedWord.length >= 3 && word.includes(bannedWord)) {
                return true;
            }
        }
    }

    // Tüm mesaj içinde arama (boşluksuz yazılmış olabilir)
    for (const bannedWord of ALL_BANNED_WORDS) {
        if (bannedWord.length >= 4 && normalizedMessage.includes(bannedWord)) {
            return true;
        }
    }

    return false;
}

/**
 * Mesajı filtreler ve sonucu döndürür
 * Artık engellemek yerine sansürleyerek mesajı kabul ediyor
 * @param message Kontrol edilecek mesaj
 * @returns { isValid: boolean, censoredMessage: string }
 */
export function filterMessage(message: string): { isValid: boolean; censoredMessage: string; errorMessage?: string } {
    const censored = censorMessage(message);
    return {
        isValid: true, // Artık her zaman geçerli, sadece sansürlü
        censoredMessage: censored
    };
}

/**
 * Mesajdaki küfürleri sansürler (****** ile değiştirir)
 * @param message Sansürlenecek mesaj
 * @returns Sansürlenmiş mesaj
 */
export function censorMessage(message: string): string {
    if (!message || typeof message !== 'string') {
        return message;
    }

    let result = message;

    // Her yasaklı kelime için kontrol et ve sansürle
    for (const bannedWord of ALL_BANNED_WORDS) {
        // Case-insensitive regex oluştur
        const regex = new RegExp(bannedWord, 'gi');
        result = result.replace(regex, '*'.repeat(bannedWord.length));
    }

    return result;
}

/**
 * Yasaklı kelime uyarısı için mesaj (artık kullanılmıyor ama uyumluluk için kalıyor)
 */
export const BANNED_WORD_WARNING = 'Mesajınız otomatik olarak sansürlendi.';

