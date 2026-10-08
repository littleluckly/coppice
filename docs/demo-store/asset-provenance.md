# 演示店素材存档 — asset-provenance.md

> **性质**：SDD §9.3 要求的素材来源存档——每张图的生成工具、日期、提示词摘要、用途与状态。  
> **权威关系**：图的内容要求以 `dev-docs/task-index.md` T-0.2"产品图出图规格"与 `dev-docs/sdd.md` §9.3 为准；本文件是**台账**，不承载验收标准。  
> **维护规则**：每张图上传 Shopify Files 后，把 URL 与 v= 参数回填本表 + `build_mower_csv.py` IMAGES 字典（产品图）/ 主题编辑器选图（hero、用例图），状态改 ✅。

---

## 1. 命名规范（v1，2026-10-08 定稿）

### 产品图（22 张）

```
product-<nb-model>-<seq>-<variant>.jpg
```

| 段        | 取值                                                                                                        | 说明                                     |
| -------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| nb-model | `nb-21p` `nb-21ph` `nb-21s` `nb-22s` `nb-21bp` `nb-21bs` `nb-21b80` `nb-42t` `nb-42th` `nb-42tc` `nb-42z` | 型号小写，与 CSV handle 去掉 `northbark-` 前缀一致 |
| seq      | `1` 主图（左前 45° 棚拍） / `2` 次图（细节/全家福）                                                                        | 位置对应 CSV Image Position                |
| variant  | 见各款清单                                                                                                     | 自解释的内容词                                |

示例：`product-nb-21p-1-main.jpg`、`product-nb-21bp-2-kit.jpg`、`product-nb-42z-2-controls.jpg`

格式 **JPG**（或 WebP，统一即可），2048×2048，≤500 KB。

### 场景图（hero / 用例，已验收沿用既有名）

```
mower-<scene>-<machine>-<device>_webp.webp
```

- scene：`small-yard` / `large-lawn`；machine：`push` / `ride-on`；device：`pc-16x9` / `mobile-3x4`
- 已验收的 8 张保持原名不动；`_webp` 后缀是历史命名（webp 扩展已表达格式，冗余但无害），未来新增场景图**不带**该后缀，直接 `.webp` 收尾。

### alt 规则

`Northbark <MODEL> <画面实质描述>`——产品图 alt 已预写在 `build_mower_csv.py` IMAGES 字典，出图后逐张复核图文一致；场景图 alt 在主题编辑器/section 设置里填。

---

## 2. 生成工具与商用许可（§9.3 行 1）

| 项        | 记录                                                                         |
| -------- | -------------------------------------------------------------------------- |
| 生成工具     | **即梦（Jimeng）**，图片生成；建议选最高分辨率、**1:1 比例**                                    |
| 商用许可核验   | ⚠️ 待核验并登记：确认当前套餐允许商用、生成时**关闭/去除平台水印**（第一批"豆包AI生成"水印即栽在此）。条款链接/截图存档路径：*待登记* |
| 核验人 / 日期 | *待登记*                                                                      |

> **即梦出图自查三件事**（生成后立刻看）：①画面无任何文字/标志/按钮；②右下角无平台水印；③机器形态与台账"内容"列一致（电池款无排气管、zero-turn 无方向盘）。任一不过 → 重出该张，别将就。

---

## 3. 场景图台账（hero / 用例，✅ 已验收 2026-10-08）

| 文件名                                           | 用途                      | 规格        | 状态          |
| --------------------------------------------- | ----------------------- | --------- | ----------- |
| mower-small-yard-push-pc-16x9_webp.webp       | hero 幻灯（小院·走步）          | 2560×1440 | ✅ 已上传 Files |
| mower-small-yard-push-mobile-3x4_webp.webp    | hero 移动备图               | 1296×1728 | ✅           |
| mower-small-yard-ride-on-pc-16x9_webp.webp    | hero 幻灯                 | 2560×1440 | ✅           |
| mower-small-yard-ride-on-mobile-3x4_webp.webp | hero 移动备图               | 1296×1728 | ✅           |
| mower-large-lawn-push-pc-16x9_webp.webp       | hero 幻灯                 | 2560×1440 | ✅           |
| mower-large-lawn-push-mobile-3x4_webp.webp    | hero 移动备图               | 1296×1728 | ✅           |
| mower-large-lawn-ride-on-pc-16x9_webp.webp    | hero 幻灯                 | 2560×1440 | ✅           |
| mower-large-lawn-ride-on-mobile-3x4_webp.webp | hero 移动备图               | 1296×1728 | ✅           |
| mower-small-yard-push-pc-16x9_webp.webp       | **兼** Small Yards 用例卡配图 | 同上        | ✅           |
| mower-large-lawn-ride-on-pc-16x9_webp.webp    | **兼** Large Lawns 用例卡配图 | 同上        | ✅           |

提示词摘要：见 §5 场景图模板（本地存档 `dev-docs/local-assets/`，生成日期 2026-10-08 上传）。

---

## 4. 产品图台账（22 张 = 11 款 × 2，状态：待生成）

**两步出图工作流（10-08 定稿，利用即梦参考图能力）**：

1. **第一批：11 张 main 主图**——纯文生图，按台账 #1/3/5/7/9/11/13/15/17/19/21 的提示词逐张生成，挑定稿
2. **第二批：11 张 second 细节图**——以**同款主图定稿**作为即梦参考图上传，再复制台账对应 second 提示词（全部以"参考图的细节特写，不要变更产品任何特征，仅展示细节："开头）生成

> 这套流程的收益：细节图里的机器与主图**逐像素同款**，§9.3 型号一致性从"提示词约束"升级为"参考图锁定"。kit 全家福三条（#10/12/14）是唯一允许"加东西"的（参考机不变 + 增加电池充电器），提示词里已写明。

"提示词（即梦）"列**整条直接复制**到即梦即可，每条自包含；生成后按 §2 的三件事自查。

| #  | 文件名                                  | 提示词（即梦·直接复制）                                                                                                                        | alt（出图后按画面复核）                                                                                 | 工具/日期 | Files URL                                                                                                        | 状态 |
| -- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------- | -- |
| 1  | product-nb-21p-1-main.jpg            | 电商产品摄影，一台绿色的21英寸手推式汽油割草机，后配集草袋，左前方45度视角，纯浅灰色摄影棚背景，柔和均匀布光，四个黑色小轮，金属刀盘底盘，画面干净，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                          | Northbark NB-21P 21-inch gas walk-behind push mower with rear grass bag, three-quarter view   | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21p-1-main_webp.webp?v=1791447564>            | ✅ 已核验 ||
| 2  | product-nb-21p-2-bag.jpg             | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿色21英寸手推式汽油割草机的后部集草袋，展示集草袋安装接口与侧排/后排/粉碎三合一排放口。纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图           | Northbark NB-21P rear grass bag and 3-in-1 discharge detail                                   | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21p-2-bag_webp.webp?v=1791447566>             | ✅ 已核验 ||
| 3  | product-nb-21ph-1-main.jpg           | 电商产品摄影，一台绿色的21英寸手推式汽油割草机，后轮明显比前轮大（高轮设计），配集草袋，左前方45度视角，纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                               | Northbark NB-21PH 21-inch high-wheel push gas mower with rear bag, three-quarter view         | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21ph-1-main_webp.webp?v=1791447564>           | ✅ 已核验 ||
| 4  | product-nb-21ph-2-wheels.jpg         | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿色21英寸高轮手推割草机的后轮，11英寸大直径橡胶后轮与银色轮毂，展示越野通过性设计。纯浅灰色摄影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图               | Northbark NB-21PH 11-inch rear high wheel detail                                              | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21ph-2-wheels_webp.webp?v=1791447565>         | ✅ 已核验 ||
| 5  | product-nb-21s-1-main.jpg            | 电商产品摄影，一台绿色的21英寸自走式汽油割草机，后轮驱动，把手上有变速控制杆，左前方45度视角，纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                                    | Northbark NB-21S 21-inch gas self-propelled mower with rear grass bag, three-quarter view     | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21s-1-main_webp.webp?v=1791447564>            | ✅ 已核验 ||
| 6  | product-nb-21s-2-controls.jpg        | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿色自走式割草机把手部位的变速控制杆，单手操作杆与调速刻度结构（刻度为纯色块，无数字无文字）。纯浅灰色摄影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图            | Northbark NB-21S variable speed control lever detail                                          | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21s-2-controls_webp.webp?v=1791447562>        | ✅ 已核验 ||
| 7  | product-nb-22s-1-main.jpg            | 电商产品摄影，一台绿色的22英寸自走式汽油割草机，机身比常规21英寸款略大更宽，左前方45度视角，纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                                    | Northbark NB-22S 22-inch self-propelled gas mower, three-quarter view                         | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-22s-1-main_webp.webp?v=1791447563>            | ✅ 已核验 ||
| 8  | product-nb-22s-2-height-adjuster.jpg | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿色22英寸自走式割草机的单杆高度调节机构，位于刀盘壳体与轮轴之间的单杆操作结构，档位标识为纯色块无文字。纯浅灰色摄影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图      | Northbark NB-22S single-lever height adjuster detail                                          | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-22s-2-height-adjuster_webp.webp?v=1791447565> | ✅ 已核验 ||
| 9  | product-nb-21bp-1-main.jpg           | 电商产品摄影，一台灰黑色的21英寸电池供电无刷手推式割草机，纯电动设计没有排气管没有油箱盖没有拉绳启动器，左前方45度视角，纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                       | Northbark NB-21BP 21-inch brushless cordless push mower kit with two batteries and charger    | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21bp-1-main_webp.webp?v=1791447562>           | ✅ 已核验 ||
| 10 | product-nb-21bp-2-kit.jpg            | 参考图的细节特写，不要变更产品任何特征，仅展示细节：参考图中的灰黑色21英寸电池割草机保持原样，旁边整齐摆放两块不同容量的滑入式锂电池组和一台充电器，构成套装全家福。纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图  | Northbark NB-21BP kit with 4.0 Ah and 2.0 Ah batteries and charger                            | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21bp-2-kit_webp.webp?v=1791447564>            | ✅ 已核验 ||
| 11 | product-nb-21bs-1-main.jpg           | 电商产品摄影，一台灰黑色的21英寸电池供电无刷自走式割草机，后轮驱动，纯电动设计没有排气管没有油箱盖，后配集草袋，左前方45度视角，纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                   | Northbark NB-21BS 21-inch 40V brushless cordless self-propelled mower with rear grass bag     | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21bp-1-main_webp.webp?v=1791447562>           | ✅ 暂共用 #9 图（BP 手推款），BS 专属主图待补，alt 已按共用图对齐 ||
| 12 | product-nb-21bs-2-kit.jpg            | 参考图的细节特写，不要变更产品任何特征，仅展示细节：参考图中的灰黑色21英寸电池自走式割草机保持原样，旁边整齐摆放两块相同的滑入式锂电池组和一台充电器，构成套装全家福。纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-21BS kit with two 6.0 Ah batteries and charger                                   | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21bp-2-kit_webp.webp?v=1791447564>            | ✅ 暂共用 #10 图，BS 专属 kit 图待补（2×6.0Ah 同款电池） ||
| 13 | product-nb-21b80-1-main.jpg          | 电商产品摄影，一台灰黑色的21英寸80伏电池供电无刷自走式割草机，机身厚实饱满，纯电动设计没有排气管没有油箱盖，左前方45度视角，纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                    | Northbark NB-21B80 80V brushless self-propelled cordless mower, three-quarter view            | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21b80-1-main_webp.webp?v=1791447560>          | ✅ 已核验 ||
| 14 | product-nb-21b80-2-kit.jpg           | 参考图的细节特写，不要变更产品任何特征，仅展示细节：参考图中的灰黑色80伏电池自走式割草机保持原样，旁边整齐摆放两块大容量滑入式锂电池组和一台充电器，构成套装全家福。纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图  | Northbark NB-21B80 kit with 5.0 Ah battery and charger                                        | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21b80-2-kit_webp.webp?v=1791447563>           | ✅ 以图为准（2026-10-08 二次决策）：CSV 描述与 alt 已改为双电池套装 ||
| 15 | product-nb-42t-1-main.jpg            | 电商产品摄影，一台绿灰配色的42英寸驾乘式割草机，有方向盘和座椅，四个宽大轮胎，左前方45度视角，纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                                    | Northbark NB-42T 42-inch lawn tractor, three-quarter view                                     | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42t-1-main_webp.webp?v=1791447563>            | ✅ 已核验 ||
| 16 | product-nb-42t-2-controls.jpg        | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿灰配色42英寸驾乘式割草机的驾驶位，展示脚踏板和简洁仪表盘（仪表盘为纯色块无数字无文字）。纯浅灰色摄影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图             | Northbark NB-42T foot pedal and dashboard detail                                              | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42t-2-controls_webp.webp?v=1791447564>        | ✅ 已核验 ||
| 17 | product-nb-42th-1-main.jpg           | 电商产品摄影，一台绿灰配色的42英寸液压传动驾乘式割草机，带黑色遮阳篷顶棚，有方向盘和座椅，车身线条流畅，左前方45度视角，纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                                | Northbark NB-42TH 42-inch riding lawn mower with hydrostatic transmission, three-quarter view | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42th-1-main_webp.webp?v=1791447563>           | ✅ 以图为准：遮阳篷纳入 NB-42TH 设定，CSV 描述与 alt 已同步 ||
| 18 | product-nb-42th-2-controls.jpg       | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿灰配色42英寸液压驾乘式割草机的遮阳篷顶棚，黑色帆布篷面与支撑折叠支架结构。纯浅灰色摄影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图          | Northbark NB-42TH hydrostatic control and cruise lever detail                                 | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42th-2-controls_webp.webp?v=1791447559>       | ✅ 以图为准：variant 实为遮阳篷特写（URL 文件名沿用 controls 不重传），alt 已同步 ||
| 19 | product-nb-42tc-1-main.jpg           | 电商产品摄影，一台绿灰配色的42英寸经典款驾乘式割草机，7速CVT变速箱设计，有方向盘和座椅，左前方45度视角，纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                             | Northbark NB-42TC 42-inch riding lawn mower with 7-speed CVT, three-quarter view              | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42tc-1-main_webp.webp?v=1791447564>       | ⛔ 待补（10-08 复核）：覆盖上传未生效——同 URL 下载仍为换挡杆细节图。需删除原文件后以新文件名重传整机主图（建议 product-nb-42tc-1-main.webp），新 URL 发小s ||
| 20 | product-nb-42tc-2-controls.jpg       | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿灰配色42英寸驾乘式割草机的换挡杆，7档位换挡结构（档位标识为纯色块无数字无文字）。纯浅灰色摄影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                | Northbark NB-42TC gear shift detail                                                           | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42tc-2-controls_webp.webp?v=1791447564>       | ✅ 已核验 ||
| 21 | product-nb-42z-1-main.jpg            | 电商产品摄影，一台红黑配色的42英寸零转向座驾式割草机，双操纵杆转向设计没有方向盘，座椅后置，工业感造型，左前方45度视角，纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                       | Northbark NB-42Z 42-inch zero-turn riding mower, three-quarter view                           | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42z-1-main_webp.webp?v=1791447563>            | ✅ 已核验 ||
| 22 | product-nb-42z-2-controls.jpg        | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台红黑配色42英寸零转向割草机的操控区，左右两根独立操纵杆与座椅。纯浅灰色摄影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                           | Northbark NB-42Z dual lap bar controls detail                                                 | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42z-2-controls_webp.webp?v=1791447564>        | ✅ 已核验 ||

> **#8 历次决策备注**：原方案为"垂直收纳"图——垂直收纳确是 NB-22S 的设定产品特性（CSV 描述原文 "Vertical storage cuts the storage footprint by up to 70%"，泛化自真实机型 Toro SmartStow 类设计），**但 2026-10-08 即梦实测翻车**（垂直姿态训练样本少，折叠把手结构画错），按预埋备选方案改为此图。注意：CSV 描述里的垂直收纳卖点仍在，只是无对应细节图，不算撒谎；其余 10 款提示词中不得出现直立姿态（普通汽油机油路未密封，不能立）。若日后想恢复此图，参考图务必用 NB-22S 主图定稿。

**一致性硬约束**（§9.3）：NB-21 系刀盘 21 in、NB-22S 22 in、NB-42 系 42 in；BP/BS/B80 无排气管无油箱盖；42Z 为操纵杆转向（无方向盘）；造型语言=汽油走步绿 / 电池走步灰黑 / tractor 绿灰 / zero-turn 红黑（同 hero 矩阵）。

---

## 5. 提示词模板（设计依据，日常出图用 §4 台账逐行提示词）

§4 每条提示词由以下模板拼装，改机型/颜色/细节词时以此为基准，保证系列一致性（§9.3 视觉一致性）：

**主图**：`电商产品摄影，一台<颜色>的<规格+机型描述>，左前方45度视角，纯浅灰色摄影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图`

**细节图（参考图模式，10-08 起默认）**：上传同款主图为参考图 → `参考图的细节特写，不要变更产品任何特征，仅展示细节：<部件与结构说明>。纯浅灰色摄影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图`——kit 全家福变体把"仅展示细节"句换成"参考图中的机器保持原样，旁边整齐摆放<电池/充电器>，构成套装全家福"。

**场景图**（hero/用例已验收，留档）：`aerial-ish lifestyle scene of <scene> with <machine> mowing, no people faces, no logos, no text, no watermarks, 16:9 / 3:4`

**刻度/仪表防翻车写法**：任何带刻度、档位、仪表的细节图，提示词必须加"（刻度为纯色块，无数字无文字）"——生成模型最爱在刻度处吐字。
