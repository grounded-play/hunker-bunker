# Steam Item Tags & Format Strings Multilingual Matrix

This document provides the complete translation matrix for the **4 Categories**, **25 Tag Values**, and **Format Strings** across Steam's top global languages for **Hunker Bunker (App ID: 4957040)**.

To apply: Go to **Steamworks Partner → Apps → Hunker Bunker → Inventory Service → Item Tags** and select each language tab to paste these values.

---

## 1. Format Strings Hierarchy (Display Names)

Steam checks format strings from Priority 1 downward, selecting the first string where all category tokens match.

| Priority | Format String | Example Output (English) | Example Output (Simplified Chinese) | Example Output (Russian) |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `%rarity% %ITEMNAME%` | *Epic Glitched Circuit Bolter* | *史诗 故障电路发射器* | *Эпический Сбоящий болтер* |
| **2** | `%ITEMNAME%` | *Relic Decryption Key* | *遗物解密钥匙* | *Ключ дешифрования реликвий* |

---

## 2. Category Labels (4 Categories)

| Category Internal Name | English | Simplified Chinese (zh-CN) | Russian (ru) | Spanish - LATAM (es-419) | German (de) | Japanese (ja) | Brazilian Portuguese (pt-BR) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `class` | **Class** | **职业** | **Класс** | **Clase** | **Klasse** | **クラス** | **Classe** |
| `rarity` | **Rarity** | **稀有度** | **Редкость** | **Rareza** | **Seltenheit** | **レアリティ** | **Raridade** |
| `season` | **Season** | **赛季** | **Сезон** | **Temporada** | **Saison** | **シーズン** | **Temporada** |
| `slot` | **Slot** | **槽位** | **Ячейка** | **Ranura** | **Slot** | **スロット** | **Espaço** |

---

## 3. Category 1: `class` (4 Tags)

| Tag Internal Name | English | Simplified Chinese (zh-CN) | Russian (ru) | Spanish - LATAM (es-419) | German (de) | Japanese (ja) | Brazilian Portuguese (pt-BR) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `all` | **All Classes** | **所有职业** | **Все классы** | **Todas las clases** | **Alle Klassen** | **全クラス** | **Todas as Classes** |
| `engineer` | **Engineer** | **工程兵** | **Инженер** | **Ingeniero** | **Ingenieur** | **エンジニア** | **Engenheiro** |
| `scout` | **Scout** | **侦察兵** | **Разведчик** | **Explorador** | **Späher** | **スカウト** | **Batedor** |
| `tank` | **Tank** | **重装兵** | **Тяжеловес** | **Tanque** | **Panzer** | **タンク** | **Tanque** |

---

## 4. Category 2: `rarity` (6 Tags)

*Tuned as adjectives so they naturally prefix `%ITEMNAME%` in the format `%rarity% %ITEMNAME%`:*

| Tag Internal Name | English | Simplified Chinese (zh-CN) | Russian (ru) | Spanish - LATAM (es-419) | German (de) | Japanese (ja) | Brazilian Portuguese (pt-BR) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `uncommon` | **Uncommon** | **罕见** | **Необычный** | **Poco común** | **Ungewöhnlich** | **アンコモン** | **Incomum** |
| `rare` | **Rare** | **稀有** | **Редкий** | **Raro** | **Selten** | **レア** | **Raro** |
| `epic` | **Epic** | **史诗** | **Эпический** | **Épico** | **Episch** | **エピック** | **Épico** |
| `legendary` | **Legendary** | **传奇** | **Легендарный** | **Legendario** | **Legendär** | **レジェンダリー** | **Lendário** |
| `container` | **Sealed** | **密封** | **Запечатанный** | **Sellado** | **Versiegelt** | **封印** | **Selado** |
| `key` | **Encrypted** | **加密** | **Зашифрованный** | **Cifrado** | **Verschlüsselt** | **暗号化** | **Criptografado** |

---

## 5. Category 3: `season` (1 Tag)

| Tag Internal Name | English | Simplified Chinese (zh-CN) | Russian (ru) | Spanish - LATAM (es-419) | German (de) | Japanese (ja) | Brazilian Portuguese (pt-BR) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `0` | **Season 0** | **第0赛季** | **Сезон 0** | **Temporada 0** | **Saison 0** | **シーズン0** | **Temporada 0** |

---

## 6. Category 4: `slot` (14 Tags)

| Tag Internal Name | English | Simplified Chinese (zh-CN) | Russian (ru) | Spanish - LATAM (es-419) | German (de) | Japanese (ja) | Brazilian Portuguese (pt-BR) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cache` | **Cache** | **物资箱** | **Контейнер** | **Alijo** | **Cache** | **コンテナ** | **Caixa de Suprimentos** |
| `cache_key` | **Cache Key** | **解密码匙** | **Ключ дешифрования** | **Llave de alijo** | **Schlüssel** | **暗号キー** | **Chave de Decodificação** |
| `chassis_skin` | **Operator Chassis** | **特工装甲机体** | **Корпус оператора** | **Chasis de operador** | **Chassis** | **機体スキン** | **Chassi de Operador** |
| `decal` | **Decal** | **臂章与印花** | **Эмблема** | **Calcomanía** | **Abzeichen** | **デカール** | **Emblema** |
| `hud_theme` | **HUD Theme** | **HUD界面主题** | **Тема интерфейса** | **Tema de HUD** | **HUD-Design** | **HUDテーマ** | **Tema do HUD** |
| `muzzle_fx` | **Muzzle Flare** | **枪口枪焰特效** | **Вспышка выстрела** | **Fogonazo** | **Mündungsfeuer** | **マズルフラッシュ** | **Clarão de Disparo** |
| `patch` | **Patch** | **徽章** | **Шеврон** | **Parche** | **Aufnäher** | **パッチ** | **Insígnia** |
| `reagent` | **Reagent** | **锻造材料** | **Реагент** | **Reactivo** | **Reagenz** | **素材** | **Reagente** |
| `rig_overclock` | **Rig Module** | **机甲超频模块** | **Модуль экзоскелета** | **Módulo de traje** | **Rig-Modul** | **リグモジュール** | **Módulo de Traje** |
| `sheen` | **Weapon Sheen** | **武器光泽材质** | **Блеск оружия** | **Brillo de arma** | **Waffenglanz** | **ウェポンシャイン** | **Brilho de Arma** |
| `tracer_fx` | **Tracer Rounds** | **弹道曳光弹** | **Трассирующие пули** | **Balas trazadoras** | **Leuchtspur** | **曳光弾エフェクト** | **Balas Traçantes** |
| `voice_pack` | **Voice Pack** | **通讯语音包** | **Голосовой пакет** | **Paquete de voz** | **Sprachpaket** | **ボイスパック** | **Pacote de Voz** |
| `weapon_charm` | **Weapon Charm** | **战术武器挂件** | **Брелок для оружия** | **Amuleto de arma** | **Waffenanhänger**| **武器チャーム** | **Pingente de Arma** |
| `weapon_finish` | **Weapon Finish** | **枪械涂装** | **Окраска оружия** | **Acabado de arma** | **Waffenlackierung**| **武器スキン** | **Pintura de Arma** |
