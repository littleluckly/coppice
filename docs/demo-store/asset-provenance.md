# 演示店素材存档 — asset-provenance.md

> **性质**：SDD §9.3 要求的素材来源存档——每张图的生成工具、日期、提示词摘要、用途与状态。  
> **权威关系**：图的内容要求以 `dev-docs/task-index.md` T-0.2"产品图出图规格"与 `dev-docs/sdd.md` §9.3 为准；本文件是**台账**，不承载验收标准。  
> **维护规则**：每张图上传 Shopify Files 后，把 URL 与 v= 参数回填本表 + `build_mower_csv.py` IMAGES 字典（产品图）/ 主题编辑器选图（hero、用例图），状态改 ✅。



---

## 1. 命名规范（v1 2026-10-08 定稿；v2 2026-10-26 补品类前缀与去背标记）

### 产品图（53 张 = 主机 21 款 × 2 + 配件 11 款 × 1）

**两代命名并存，以 Files 里的实际文件名为准：**

```
v1（割草机 22 张，历史）        product-<nb-model>-<seq>-<variant>_webp.webp
v2（打草机 + 链锯 20 张，现行） product-<category>-<nb-model>-<seq>-<variant>.png
v3（配件 11 张，现行）          product-accessory-<nb-model>-1-main.png
```

| 段        | 取值                                                                                                                                                                                                                              | 说明                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| category | `string-trimmer` / `chainsaw` / `accessory`（v2 起加，便于在 Files 里按品类筛）                                                                                                                                                        | 与 CSV handle 的品类前缀一致                   |
| nb-model | 割草机 `nb-21p` `nb-21ph` `nb-21s` `nb-22s` `nb-21bp` `nb-21bs` `nb-21b80` `nb-42t` `nb-42th` `nb-42tc` `nb-42z`<br />打草机 `nb-t21` `nb-t27` `nb-t28` `nb-t40b` `nb-t60b`<br />链锯 `nb-c16g` `nb-c18g` `nb-c20g` `nb-c40b` `nb-c80b` | 型号小写，与 CSV handle 去掉 `northbark-` 前缀一致 |
| seq      | `1` 主图（左前 45° 棚拍） / `2` 次图（细节/全家福）。**配件只出 seq 1** |                                                                                                                                                                                              | 位置对应 CSV Image Position                |
| variant  | 见各款清单                                                                                                                                                                                                                           | 自解释的内容词                                |

示例（v2）：`product-chainsaw-nb-c16g-1-main_rmbg_webp.webp`、`product-string-trimmer-nb-t40b-2-kit_rmbg_webp.webp`

- 后缀 `_rmbg_` = 已去背景；`_webp` 是历史冗余段（扩展名已表达格式）。两段都**不影响引用**，URL 才是权威。
- 格式 **WebP**（v1 有 JPG 时期），2048×2048（v1 为 1536×1536），单张 140–200 KB。

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

> 本节是 2026-10-08 的割草机 11 款（图已全部出完）。2026-10-26 新增的打草机与链锯 10 款见 **§4b**。

**两步出图工作流（10-08 定稿，利用即梦参考图能力）**：

1. **第一批：11 张 main 主图**——纯文生图，按台账 #1/3/5/7/9/11/13/15/17/19/21 的提示词逐张生成，挑定稿
2. **第二批：11 张 second 细节图**——以**同款主图定稿**作为即梦参考图上传，再复制台账对应 second 提示词（全部以"参考图的细节特写，不要变更产品任何特征，仅展示细节："开头）生成

> 这套流程的收益：细节图里的机器与主图**逐像素同款**，§9.3 型号一致性从"提示词约束"升级为"参考图锁定"。kit 全家福三条（#10/12/14）是唯一允许"加东西"的（参考机不变 + 增加电池充电器），提示词里已写明。

"提示词（即梦）"列**整条直接复制**到即梦即可，每条自包含；生成后按 §2 的三件事自查。

| #  | 文件名                                  | 提示词（即梦·直接复制）                                                                                                                       | alt（出图后按画面复核）                                                                                 | 工具/日期 | Files URL                                                                                                        | 状态                                                                                                    |   |
| -- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | - |
| 1  | product-nb-21p-1-main.jpg            | 电商产品摄影，一台绿色的21英寸手推式汽油割草机，后配集草袋，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，四个黑色小轮，金属刀盘底盘，画面干净，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                          | Northbark NB-21P 21-inch gas walk-behind push mower with rear grass bag, three-quarter view   | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21p-1-main_webp.webp?v=1791447564>            | ✅ 已核验                                                                                                 |   |
| 2  | product-nb-21p-2-bag.jpg             | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿色21英寸手推式汽油割草机的后部集草袋，展示集草袋安装接口与侧排/后排/粉碎三合一排放口。无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图           | Northbark NB-21P rear grass bag and 3-in-1 discharge detail                                   | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21p-2-bag_webp.webp?v=1791447566>             | ✅ 已核验                                                                                                 |   |
| 3  | product-nb-21ph-1-main.jpg           | 电商产品摄影，一台绿色的21英寸手推式汽油割草机，后轮明显比前轮大（高轮设计），配集草袋，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                               | Northbark NB-21PH 21-inch high-wheel push gas mower with rear bag, three-quarter view         | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21ph-1-main_webp.webp?v=1791447564>           | ✅ 已核验                                                                                                 |   |
| 4  | product-nb-21ph-2-wheels.jpg         | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿色21英寸高轮手推割草机的后轮，11英寸大直径橡胶后轮与银色轮毂，展示越野通过性设计。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图               | Northbark NB-21PH 11-inch rear high wheel detail                                              | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21ph-2-wheels_webp.webp?v=1791447565>         | ✅ 已核验                                                                                                 |   |
| 5  | product-nb-21s-1-main.jpg            | 电商产品摄影，一台绿色的21英寸自走式汽油割草机，后轮驱动，把手上有变速控制杆，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                                    | Northbark NB-21S 21-inch gas self-propelled mower with rear grass bag, three-quarter view     | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21s-1-main_webp.webp?v=1791447564>            | ✅ 已核验                                                                                                 |   |
| 6  | product-nb-21s-2-controls.jpg        | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿色自走式割草机把手部位的变速控制杆，单手操作杆与调速刻度结构（刻度为纯色块，无数字无文字）。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图            | Northbark NB-21S variable speed control lever detail                                          | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21s-2-controls_webp.webp?v=1791447562>        | ✅ 已核验                                                                                                 |   |
| 7  | product-nb-22s-1-main.jpg            | 电商产品摄影，一台绿色的22英寸自走式汽油割草机，机身比常规21英寸款略大更宽，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                                    | Northbark NB-22S 22-inch self-propelled gas mower, three-quarter view                         | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-22s-1-main_webp.webp?v=1791447563>            | ✅ 已核验                                                                                                 |   |
| 8  | product-nb-22s-2-height-adjuster.jpg | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿色22英寸自走式割草机的单杆高度调节机构，位于刀盘壳体与轮轴之间的单杆操作结构，档位标识为纯色块无文字。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图      | Northbark NB-22S single-lever height adjuster detail                                          | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-22s-2-height-adjuster_webp.webp?v=1791447565> | ✅ 已核验                                                                                                 |   |
| 9  | product-nb-21bp-1-main.jpg           | 电商产品摄影，一台灰黑色的21英寸电池供电无刷手推式割草机，纯电动设计没有排气管没有油箱盖没有拉绳启动器，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                       | Northbark NB-21BP 21-inch brushless cordless push mower kit with two batteries and charger    | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21bp-1-main_webp.webp?v=1791447562>           | ✅ 已核验                                                                                                 |   |
| 10 | product-nb-21bp-2-kit.jpg            | 参考图的细节特写，不要变更产品任何特征，仅展示细节：参考图中的灰黑色21英寸电池割草机保持原样，旁边整齐摆放两块不同容量的滑入式锂电池组和一台充电器，构成套装全家福。无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图  | Northbark NB-21BP kit with 4.0 Ah and 2.0 Ah batteries and charger                            | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21bp-2-kit_webp.webp?v=1791447564>            | ✅ 已核验                                                                                                 |   |
| 11 | product-nb-21bs-1-main.jpg           | 电商产品摄影，一台灰黑色的21英寸电池供电无刷自走式割草机，后轮驱动，纯电动设计没有排气管没有油箱盖，后配集草袋，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                   | Northbark NB-21BS 21-inch 40V brushless cordless self-propelled mower with rear grass bag     | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21bp-1-main_webp.webp?v=1791447562>           | ✅ 暂共用 #9 图（BP 手推款），BS 专属主图待补，alt 已按共用图对齐                                                              |   |
| 12 | product-nb-21bs-2-kit.jpg            | 参考图的细节特写，不要变更产品任何特征，仅展示细节：参考图中的灰黑色21英寸电池自走式割草机保持原样，旁边整齐摆放两块相同的滑入式锂电池组和一台充电器，构成套装全家福。无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-21BS kit with two 6.0 Ah batteries and charger                                   | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21bp-2-kit_webp.webp?v=1791447564>            | ✅ 暂共用 #10 图，BS 专属 kit 图待补（2×6.0Ah 同款电池）                                                               |   |
| 13 | product-nb-21b80-1-main.jpg          | 电商产品摄影，一台灰黑色的21英寸80伏电池供电无刷自走式割草机，机身厚实饱满，纯电动设计没有排气管没有油箱盖，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                    | Northbark NB-21B80 80V brushless self-propelled cordless mower, three-quarter view            | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21b80-1-main_webp.webp?v=1791447560>          | ✅ 已核验                                                                                                 |   |
| 14 | product-nb-21b80-2-kit.jpg           | 参考图的细节特写，不要变更产品任何特征，仅展示细节：参考图中的灰黑色80伏电池自走式割草机保持原样，旁边整齐摆放两块大容量滑入式锂电池组和一台充电器，构成套装全家福。无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图  | Northbark NB-21B80 kit with 5.0 Ah battery and charger                                        | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-21b80-2-kit_webp.webp?v=1791447563>           | ✅ 以图为准（2026-10-08 二次决策）：CSV 描述与 alt 已改为双电池套装                                                          |   |
| 15 | product-nb-42t-1-main.jpg            | 电商产品摄影，一台绿灰配色的42英寸驾乘式割草机，有方向盘和座椅，四个宽大轮胎，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                                    | Northbark NB-42T 42-inch lawn tractor, three-quarter view                                     | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42t-1-main_webp.webp?v=1791447563>            | ✅ 已核验                                                                                                 |   |
| 16 | product-nb-42t-2-controls.jpg        | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿灰配色42英寸驾乘式割草机的驾驶位，展示脚踏板和简洁仪表盘（仪表盘为纯色块无数字无文字）。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图             | Northbark NB-42T foot pedal and dashboard detail                                              | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42t-2-controls_webp.webp?v=1791447564>        | ✅ 已核验                                                                                                 |   |
| 17 | product-nb-42th-1-main.jpg           | 电商产品摄影，一台绿灰配色的42英寸液压传动驾乘式割草机，带黑色遮阳篷顶棚，有方向盘和座椅，车身线条流畅，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                       | Northbark NB-42TH 42-inch riding lawn mower with hydrostatic transmission, three-quarter view | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42th-1-main_webp.webp?v=1791447563>           | ✅ 以图为准：遮阳篷纳入 NB-42TH 设定，CSV 描述与 alt 已同步                                                               |   |
| 18 | product-nb-42th-2-controls.jpg       | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿灰配色42英寸液压驾乘式割草机的遮阳篷顶棚，黑色帆布篷面与支撑折叠支架结构。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                    | Northbark NB-42TH hydrostatic control and cruise lever detail                                 | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42th-2-controls_webp.webp?v=1791447559>       | ✅ 以图为准：variant 实为遮阳篷特写（URL 文件名沿用 controls 不重传），alt 已同步                                                |   |
| 19 | product-nb-42tc-1-main.jpg           | 电商产品摄影，一台绿灰配色的42英寸经典款驾乘式割草机，7速CVT变速箱设计，有方向盘和座椅，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                             | Northbark NB-42TC 42-inch riding lawn mower with 7-speed CVT, three-quarter view              | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42tc-1-main_webp.webp?v=1791447564>           | ⛔ 待补（10-08 复核）：覆盖上传未生效——同 URL 下载仍为换挡杆细节图。需删除原文件后以新文件名重传整机主图（建议 product-nb-42tc-1-main.webp），新 URL 发小s |   |
| 20 | product-nb-42tc-2-controls.jpg       | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿灰配色42英寸驾乘式割草机的换挡杆，7档位换挡结构（档位标识为纯色块无数字无文字）。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                | Northbark NB-42TC gear shift detail                                                           | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42tc-2-controls_webp.webp?v=1791447564>       | ✅ 已核验                                                                                                 |   |
| 21 | product-nb-42z-1-main.jpg            | 电商产品摄影，一台红黑配色的42英寸零转向座驾式割草机，双操纵杆转向设计没有方向盘，座椅后置，工业感造型，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                       | Northbark NB-42Z 42-inch zero-turn riding mower, three-quarter view                           | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42z-1-main_webp.webp?v=1791447563>            | ✅ 已核验                                                                                                 |   |
| 22 | product-nb-42z-2-controls.jpg        | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台红黑配色42英寸零转向割草机的操控区，左右两根独立操纵杆与座椅。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图                           | Northbark NB-42Z dual lap bar controls detail                                                 | 即梦/待填 | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-nb-42z-2-controls_webp.webp?v=1791447564>        | ✅ 已核验                                                                                                 |   |

> **#8 历次决策备注**：原方案为"垂直收纳"图——垂直收纳确是 NB-22S 的设定产品特性（CSV 描述原文 "Vertical storage cuts the storage footprint by up to 70%"，泛化自真实机型 Toro SmartStow 类设计），**但 2026-10-08 即梦实测翻车**（垂直姿态训练样本少，折叠把手结构画错），按预埋备选方案改为此图。注意：CSV 描述里的垂直收纳卖点仍在，只是无对应细节图，不算撒谎；其余 10 款提示词中不得出现直立姿态（普通汽油机油路未密封，不能立）。若日后想恢复此图，参考图务必用 NB-22S 主图定稿。

**一致性硬约束**（§9.3）：NB-21 系刀盘 21 in、NB-22S 22 in、NB-42 系 42 in；BP/BS/B80 无排气管无油箱盖；42Z 为操纵杆转向（无方向盘）；造型语言=汽油走步绿 / 电池走步灰黑 / tractor 绿灰 / zero-turn 红黑（同 hero 矩阵）。

---

## 4b. 产品图台账（2026-10-26 新增 10 款 = 20 张，状态：✅ 已上传并回填 CSV）

**背景**：导入 CSV 新增打草机 5 款（NB-T21/T27/T28/T40B/T60B）与链锯 5 款（NB-C16G/C18G/C20G/C40B/C80B）。
2026-10-26 已全部出图、上传 Shopify Files，URL 回填 `build_mower_csv.py` 的 `IMAGES` 并重跑生成 CSV
（21 款 / 42 行 = 21 主行 + 21 第二图行，0 错误 0 警告）。

> **实际入库形式**：文件名统一为 `product-<品类>-<型号>-<序>-<内容>_rmbg_webp.webp`，`_rmbg_` = **已去背景**。
> 抽测确认：新 20 张与旧 22 张（§4）**角像素 alpha 均为 0，都是透明底**，展示底色由 CSS 提供
> （`.product-card__media img` 的 `background-color: color-mix(in srgb, var(--color-foreground) 4%, transparent)`）。
> 所以提示词里写"纯白影棚背景"是生成时的手段，交付物是透明底 —— 两套图在网格里观感一致，无需二次处理。
> Files 里的 `alt` 字段为空不影响无障碍：商品图的 alt 由 CSV 的 `Image alt text` 列提供（见本表 alt 列）。

**造型语言（延续 §4 矩阵）**：汽油打草机=绿色机身灰黑杆 / 电池打草机=灰黑机身 / 汽油链锯=绿色机身橙黑握把 / 电池链锯=灰黑机身橙黑握把。  
**共同口径**：一律左前 45° 棚拍、1:1、无文字无标志无水印无人物；电池打草机与电池链锯**不得出现排气管、油箱盖、拉绳启动器**。  
**出图流程同 §4**：先出 main 定稿，再以 main 作参考图出 second。

| # | 文件名（Files 实际名） | Files URL | 提示词（即梦·直接复制） | alt（已写入 CSV） | 状态 |
| -- | ------ | --------- | ---------------------- | ---------------- | ---- |
| 23 | product-string-trimmer-nb-t21-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-string-trimmer-nb-t21-1-main_rmbg_webp.webp?v=1793006084> | 电商产品摄影，一台绿色的21英寸直杆汽油打草机，杆身细长、带半圆环把手与打草绳切割头，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-T21 21.2 cc gas straight-shaft string trimmer, three-quarter view | ✅ 2026-10-26 已上传 |
| 24 | product-string-trimmer-nb-t21-2-gearhead_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-string-trimmer-nb-t21-2-gearhead_rmbg_webp.webp?v=1793006084> | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿色直杆打草机的齿轮箱与切割头防护罩，双线打草头结构。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-T21 straight-shaft trimmer gear head and shield detail | ✅ 2026-10-26 已上传 |
| 25 | product-string-trimmer-nb-t27-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-string-trimmer-nb-t27-1-main_rmbg_webp.webp?v=1793006084> | 电商产品摄影，一台绿色的27cc直杆汽油打草机，带半圆环把手与扳机式控制手柄，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-T27 27.2 cc gas straight-shaft string trimmer, three-quarter view | ✅ 2026-10-26 已上传 |
| 26 | product-string-trimmer-nb-t27-2-handle_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-string-trimmer-nb-t27-2-handle_rmbg_webp.webp?v=1793006084> | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿色直杆打草机的半圆环把手与控制手柄，扳机油门与熄火开关（开关为纯色块，无文字）。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-T27 loop handle and control handle detail | ✅ 2026-10-26 已上传 |
| 27 | product-string-trimmer-nb-t28-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-string-trimmer-nb-t28-1-main_rmbg_webp.webp?v=1793006084> | 电商产品摄影，一台绿色的28cc直杆汽油打草机，杆身中段有可拆联接节，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-T28 28 cc gas straight-shaft string trimmer, three-quarter view | ✅ 2026-10-26 已上传 |
| 28 | product-string-trimmer-nb-t28-2-coupling_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-string-trimmer-nb-t28-2-coupling_rmbg_webp.webp?v=1793006084> | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿色直杆打草机杆身中段的可拆卸联接节，金属卡箍与快拆结构。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-T28 detachable shaft coupling detail | ✅ 2026-10-26 已上传 |
| 29 | product-string-trimmer-nb-t40b-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-string-trimmer-nb-t40b-1-main_rmbg_webp.webp?v=1793006084> | 电商产品摄影，一台灰黑色的40伏电池无刷直杆打草机，纯电动设计没有排气管没有油箱盖没有拉绳启动器，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-T40B 40V brushless cordless string trimmer kit, three-quarter view | ✅ 2026-10-26 已上传 |
| 30 | product-string-trimmer-nb-t40b-2-kit_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-string-trimmer-nb-t40b-2-kit_rmbg_webp.webp?v=1793006084> | 参考图的细节特写，不要变更产品任何特征，仅展示细节：参考图中的灰黑色电池打草机保持原样，旁边整齐摆放一块滑入式锂电池组和一台充电器，构成套装全家福。无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-T40B kit with 4.0 Ah battery and charger | ✅ 2026-10-26 已上传 |
| 31 | product-string-trimmer-nb-t60b-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-string-trimmer-nb-t60b-1-main_rmbg_webp.webp?v=1793006084> | 电商产品摄影，一台深灰配亮绿色的60伏电池无刷直杆打草机，机身紧凑轻巧，纯电动设计没有排气管没有油箱盖，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-T60B 60V brushless cordless string trimmer kit, three-quarter view | ✅ 2026-10-26 已上传 |
| 32 | product-string-trimmer-nb-t60b-2-kit_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-string-trimmer-nb-t60b-2-kit_rmbg_webp.webp?v=1793006084> | 参考图的细节特写，不要变更产品任何特征，仅展示细节：参考图中的60伏电池打草机保持原样，旁边整齐摆放一块小容量锂电池组和一台充电器，构成套装全家福。无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-T60B kit with 2.5 Ah battery and charger | ✅ 2026-10-26 已上传 |
| 33 | product-chainsaw-nb-c16g-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-chainsaw-nb-c16g-1-main_rmbg_webp.webp?v=1793006069> | 电商产品摄影，一台绿色的16英寸汽油链锯，导板与锯链清晰可见，橙黑配色握把，配链闸挡板，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-C16G 16-inch 30.1 cc gas chainsaw, three-quarter view | ✅ 2026-10-26 已上传 |
| 34 | product-chainsaw-nb-c16g-2-bar_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-chainsaw-nb-c16g-2-bar_rmbg_webp.webp?v=1793006069> | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿色16英寸汽油链锯的导板前端与锯链张紧结构，导板导轨与链齿清晰。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-C16G guide bar, chain and chain brake detail | ✅ 2026-10-26 已上传 |
| 35 | product-chainsaw-nb-c18g-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-chainsaw-nb-c18g-1-main_rmbg_webp.webp?v=1793006069> | 电商产品摄影，一台绿色的18英寸汽油链锯，机身比16英寸款更宽更厚实，橙黑配色握把，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-C18G 18-inch 40.2 cc gas chainsaw, three-quarter view | ✅ 2026-10-26 已上传 |
| 36 | product-chainsaw-nb-c18g-2-filter_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-chainsaw-nb-c18g-2-filter_rmbg_webp.webp?v=1793006069> | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿色18英寸汽油链锯的空滤器盖与机油泵调节螺钉，盖板为纯色块无文字。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-C18G air filter cover and oiler adjustment detail | ✅ 2026-10-26 已上传 |
| 37 | product-chainsaw-nb-c20g-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-chainsaw-nb-c20g-1-main_rmbg_webp.webp?v=1793006069> | 电商产品摄影，一台绿色的20英寸农场级汽油链锯，长导板、环绕式把手、机身粗壮，橙黑配色握把，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-C20G 20-inch 59.8 cc gas chainsaw, three-quarter view | ✅ 2026-10-26 已上传 |
| 38 | product-chainsaw-nb-c20g-2-wrapper_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-chainsaw-nb-c20g-2-wrapper_rmbg_webp.webp?v=1793006069> | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台绿色20英寸链锯的环绕式把手与侧面锯链张紧调节位置，金属把手与塑料壳体交界处。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-C20G wrap handle and side-access chain tensioner detail | ✅ 2026-10-26 已上传 |
| 39 | product-chainsaw-nb-c40b-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-chainsaw-nb-c40b-1-main_rmbg_webp.webp?v=1793006069> | 电商产品摄影，一台灰黑色的40伏电池无刷链锯，16英寸导板，橙黑配色握把，纯电动设计没有排气管没有油箱盖没有拉绳启动器，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-C40B 40V brushless cordless chainsaw with 16-inch bar, three-quarter view | ✅ 2026-10-26 已上传 |
| 40 | product-chainsaw-nb-c40b-2-battery_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-chainsaw-nb-c40b-2-battery_rmbg_webp.webp?v=1793006069> | 参考图的细节特写，不要变更产品任何特征，仅展示细节：这台灰黑色电池链锯的电池仓与机身侧面收纳的工具扳手，电池仓盖为纯色块无文字。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-C40B battery bay and on-board tensioning tool detail | ✅ 2026-10-26 已上传 |
| 41 | product-chainsaw-nb-c80b-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-chainsaw-nb-c80b-1-main_rmbg_webp.webp?v=1793006069> | 电商产品摄影，一台深灰配亮绿色的80伏电池无刷链锯，18英寸导板、金属环绕把手、机身厚实，纯电动设计没有排气管没有油箱盖，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-C80B 80V brushless cordless chainsaw with 18-inch bar, three-quarter view | ✅ 2026-10-26 已上传 |
| 42 | product-chainsaw-nb-c80b-2-kit_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-chainsaw-nb-c80b-2-kit_rmbg_webp.webp?v=1793006069> | 参考图的细节特写，不要变更产品任何特征，仅展示细节：参考图中的80伏电池链锯保持原样，旁边整齐摆放一块大容量锂电池组和一台充电器，构成套装全家福。无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图 | Northbark NB-C80B kit with 4.0 Ah battery and charger | ✅ 2026-10-26 已上传 |

> **已完成的两步（2026-10-26）**：①20 张上传 Files，URL 按 `product-<品类>-<型号>-<序>-<内容>_rmbg_webp.webp` 回填
> `build_mower_csv.py` 的 `IMAGES`（10 款 × main/second = 20 个位置），重跑脚本生成 CSV；
> ②URL 与 `v=` 参数已补进本表，状态 ✅。
>
> **仍需人工过一遍**：逐张复核图文一致（尤其"电池款无排气管/无油箱盖/无拉绳启动器"这条，模型最容易照抄汽油机），
> 以及型号与规格是否对得上（如 NB-C20G 是 20 in. 长导板、NB-T28 有可拆联接节）。图对不上就单独重出该张，再回填 URL 重跑脚本。

---

---

## 4c. 配件图台账（2026-10-27 新增 11 款，状态：✅ 已上传并回填 CSV）

**为什么配件只配 1 张图**：配件本身就是"细节"，再出细节图的边际价值低，而图量会翻倍。
真要补，按 §4 的"参考图模式"以该配件主图作参考图再出。

**共同口径**：无缝纯白影棚背景、柔和均匀布光、1:1、无人物；**重点防「文字翻车」**——
刀片上的规格刻字、电池上的参数标签、包装上的型号，模型最爱乱写，提示词里统一加"表面无刻字无标签"。
**造型语言**：刀片绿漆（与主机同色系）/ 导板深灰钢 / 锯链金属本色 / 电池灰黑。
**已取消**：空气滤芯与火花塞两款商品 2026-10-27 删除（分类法缺叶子、降级类目被否），对应两张图不再需要。

| # | 文件名 | Files URL | 提示词（即梦·直接复制） | alt（已写入 CSV） | 状态 |
| -- | ------ | --------- | ---------------------- | ---------------- | ---- |
| 43 | product-accessory-nb-bl21-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-accessory-nb-bl21-1-main_rmbg_webp.webp?v=1793172282> | 电商产品摄影，一片绿色烤漆的21英寸割草机替换刀片，中央安装孔与两端上扬刃口清晰，表面无刻字无标签，正面俯视角度，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，1比1方图 | Northbark 21-inch replacement mower blade, top view | ✅ 2026-10-28 已上传 |
| 44 | product-accessory-nb-bl22-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-accessory-nb-bl22-1-main_rmbg_webp.webp?v=1793172283> | 电商产品摄影，一片绿色烤漆的22英寸割草机替换刀片，比21英寸款略长，中央安装孔与两端上扬刃口清晰，表面无刻字无标签，正面俯视角度，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，1比1方图 | Northbark 22-inch replacement mower blade, top view | ✅ 2026-10-28 已上传 |
| 45 | product-accessory-nb-bl42-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-accessory-nb-bl42-1-main_rmbg_webp.webp?v=1793172282> | 电商产品摄影，两片同款绿色烤漆割草机刀片并排平放构成刀组，刀片长度与40英寸割台匹配，表面无刻字无标签，正面俯视角度，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，1比1方图 | Northbark 42-inch deck blade set, two blades side by side, top view | ✅ 2026-10-28 已上传 |
| 46 | product-accessory-nb-bar16-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-accessory-nb-bar16-1-main_rmbg_webp.webp?v=1793172282> | 电商产品摄影，一根16英寸深灰色钢制链锯导板，侧视长条形态，导板槽与前部小半径导轮结构清晰，表面无刻字无标签，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，1比1方图 | Northbark 16-inch chainsaw guide bar, side profile | ✅ 2026-10-28 已上传 |
| 47 | product-accessory-nb-bar18-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-accessory-nb-bar18-1-main_rmbg_webp.webp?v=1793172282> | 电商产品摄影，一根18英寸深灰色钢制链锯导板，比16英寸款更长，导板槽与前部小半径导轮结构清晰，表面无刻字无标签，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，1比1方图 | Northbark 18-inch chainsaw guide bar, side profile | ✅ 2026-10-28 已上传 |
| 48 | product-accessory-nb-bar20-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-accessory-nb-bar20-1-main_rmbg_webp.webp?v=1793172282> | 电商产品摄影，一根20英寸深灰色钢制链锯导板，长条形，导板槽与前部小半径导轮结构清晰，表面无刻字无标签，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，1比1方图 | Northbark 20-inch chainsaw guide bar, side profile | ✅ 2026-10-28 已上传 |
| 49 | product-accessory-nb-ch16-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-accessory-nb-ch16-1-main_rmbg_webp.webp?v=1793172283> | 电商产品摄影，一圈盘起的金属色锯链，链齿朝上排列整齐，齿形为低反弹安全链，正面俯视角度，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，1比1方图 | Northbark 16-inch low-profile saw chain loop, coiled, top view | ✅ 2026-10-28 已上传 |
| 50 | product-accessory-nb-ch18-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-accessory-nb-ch18-1-main_rmbg_webp.webp?v=1793172283> | 电商产品摄影，一圈盘起的金属色锯链，链齿朝上，圈径比16英寸款略大，低反弹安全齿形，正面俯视角度，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，1比1方图 | Northbark 18-inch low-profile saw chain loop, coiled, top view | ✅ 2026-10-28 已上传 |
| 51 | product-accessory-nb-ch20-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-accessory-nb-ch20-1-main_rmbg_webp.webp?v=1793172282> | 电商产品摄影，一圈盘起的金属色锯链，链齿朝上，整圈更长，低反弹安全齿形，正面俯视角度，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，1比1方图 | Northbark 20-inch low-profile saw chain loop, coiled, top view | ✅ 2026-10-28 已上传 |
| 52 | product-accessory-nb-tl095-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-accessory-nb-tl095-1-main_rmbg_webp.webp?v=1793172282> | 电商产品摄影，一卷亮绿色的打草绳线轴，塑料卷盘侧面45度视角，一缕粗细均匀的尼龙线头自然伸出，盘面为纯色块无标签无文字，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，1比1方图 | Northbark 0.095-inch trimmer line spool, three-quarter view | ✅ 2026-10-28 已上传 |
| 53 | product-accessory-nb-b40-1-main_rmbg_webp.webp | <https://cdn.shopify.com/s/files/1/0802/1373/7515/files/product-accessory-nb-b40-1-main_rmbg_webp.webp?v=1793172282> | 电商产品摄影，一块灰黑色的滑入式锂电池包，侧面45度视角，露出金属触片与电池仓卡扣，外壳无标签无参数文字，电量指示灯为纯色块，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，1比1方图 | Northbark 40V 4.0 Ah slide-in lithium-ion battery pack, three-quarter view | ✅ 2026-10-28 已上传 |

> **已完成（2026-10-28）**：11 张全部上传 Files，URL 回填 `build_mower_csv.py` 的 `IMAGES`（11 个 main 位置，`second` 保持空串），
> 重跑后 **32 款 / 53 行 / 0 错误 0 警告** —— 全店商品均有主图，不再有"空图卡"。
> 实际文件名为 `product-accessory-nb-<型号>-1-main_rmbg_webp.webp`（上表已按实际名回填，原预写的 `.png` 名作废）。
>
> **仍需人工过一眼**：刀片上的假刻字、电池上的假参数标签是这类图最容易翻车的地方，
> 抽检 2–3 张确认画面干净（提示词已加"表面无刻字无标签"，但模型不一定听话）。

---

## 5. 提示词模板（设计依据，日常出图用 §4 台账逐行提示词）

§4 每条提示词由以下模板拼装，改机型/颜色/细节词时以此为基准，保证系列一致性（§9.3 视觉一致性）：

**主图**：`电商产品摄影，一台<颜色>的<规格+机型描述>，左前方45度视角，无缝纯白影棚背景，柔和均匀布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图`

**细节图（参考图模式，10-08 起默认）**：上传同款主图为参考图 → `参考图的细节特写，不要变更产品任何特征，仅展示细节：<部件与结构说明>。无缝纯白影棚背景，柔和布光，无任何文字，无标志，无水印，无人物，照片级真实感，1比1方图`——kit 全家福变体把"仅展示细节"句换成"参考图中的机器保持原样，旁边整齐摆放<电池/充电器>，构成套装全家福"。

**场景图**（hero/用例已验收，留档）：`aerial-ish lifestyle scene of <scene> with <machine> mowing, no people faces, no logos, no text, no watermarks, 16:9 / 3:4`

**刻度/仪表防翻车写法**：任何带刻度、档位、仪表的细节图，提示词必须加"（刻度为纯色块，无数字无文字）"——生成模型最爱在刻度处吐字。
