# Enishi-Protocol (縁プロトコル)

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-brightgreen.svg)](https://www.python.org/)
[![Mesh: LoRa SF12/SF7](https://img.shields.io/badge/Physical%20Mesh-LoRa%20Sub--GHz-orange.svg)]()
[![Privacy: Zero-Knowledge](https://img.shields.io/badge/Privacy-ZKP%20Citizenship-purple.svg)]()
[![Transport: One-Sender](https://img.shields.io/badge/Channel-One--Sender%20Ephemeral-teal.svg)]()

> **Asynchronous Physical Mesh Protocol with Zero-Knowledge Trust & Ephemeral One-Sender Channels**  
> *中央集権的常時接続インターネットや監視から脱却し、物理空間の定点ノード（祠/Off-Grid Node）を介して非同期にスキル・リソース（Give & Want）を結ぶ次世代P2Pプロトコル。*

---

## 1. 思想と背景 (Philosophy & Background)

### 日本語
現代のインターネットは、巨大プラットフォームによる常時監視、中央集権的認証、常時接続依存を前提としています。しかし、大規模災害時、通信遮断時、あるいは過剰なデジタル追跡社会において、人間同士の信頼と相互扶助は物理空間に根ざしたものであるべきです。

**Enishi-Protocol（縁プロトコル）** は、古来の日本の「祠（ほこら）」や「道祖神」「結（ゆい）」の精神にインスパイアされた非同期フィジカルメッシュプロトコルです。
人々は常時ネットに繋がる必要はありません。生活圏の定点ノード（寺社の祠、地域の共同直売所、コミュニティ防災倉庫）に立ち寄った際、LoRa等の超低帯域・超長距離無線を通じて「Give（提供できる技能・物資）」と「Want（必要とする支援・資材）」をカプセルとして預け、数日後に立ち寄った他者と非同期に縁を結びます。

### English
Contemporary communication architectures rely heavily on centralized cloud gatekeepers, continuous telemetry tracking, and fragile cellular infrastructure. In disaster scenarios, power grid collapses, or environments requiring sovereign privacy, mutual assistance must flourish offline.

**Enishi-Protocol** is a sovereign, delay-tolerant mesh protocol rooted in physical space. Participants interact asynchronously via local physical waypoints ("Shrines" / Off-Grid Nodes) equipped with sub-GHz LoRa radios. Capsules containing mutual aid declarations (*Give & Want*) persist in decentralized ring storage, enabling serendipitous coordination across time without continuous real-time connectivity.

---

## 2. 脅威モデルと対抗策 (Threat Model & Mitigations)

メッシュネットワークをオープンに開放すると、スパム、悪意ある野良ノードの設置、闇バイト等の犯罪インフラへの悪用、通信傍受といった重大な課題に直面します。Enishi-Protocolは以下の脅威モデルを定義し、暗号技術によって抜本的に解決します。

| 脅威 (Threat Vector) | 攻撃手法 (Attack Description) | プロトコルによる防御機構 (Protocol Defense) |
|---|---|---|
| **1. 犯罪インフラ化・スパム散布** | 匿名性を悪用したフィッシング、闇バイト募集、ボットによるストレージ枯渇攻撃 | **Zero-Knowledge Proof (ZKP) 市民性検証**<br>地域の自治体・生協・コミュニティでKYC/推薦済みの暗号学的コミットメントを保持する正規メンバーのみパケットを登録可能。本名や身元を一切明かさずに「正規市民であること」を数学的に証明。未認証パケットは即座に物理レイヤーで破棄。 |
| **2. 悪意ある野良ノード (Rogue/Sybil Node)** | 攻撃者が偽中継器を物理設置し、パケット改ざん・不正ルーティング・盗聴を試みる | **Web of Trust (WoT) ノード信頼伝播**<br>寺社の祠や消防分団など実在する信頼アンカーノードからの相互署名スコア（PageRank/EigenTrust変種）が閾値未満のノードは自動隔離・通信遮断。 |
| **3. 第三者による通信路傍受・割り込み** | カプセルに興味を持った攻撃者が、当事者間の連絡路に偽装侵入して横取り・中間者攻撃 | **Clova.EmailライクなOne-Sender使い捨て通信**<br>動的Prefixアドレスを発行し、最初に接続してきた正規ピア1人のみに暗号化ロック。後から侵入を試みる第三者のパケットは自動バウンス。 |
| **4. 物理ノード差押え・解析** | 物理定点ノードが第三者に奪取・分解され、通信履歴や個人情報がフォレンジック調査される | **揮発性自己破壊 (Auto-Wipe & Zero Residuals)**<br>One-Sender通信完了時またはTTL経過時に、メモリ上のペイロードをゼロクリアしてインボックスを完全消去。ストレージには平文個人情報を一切残さない。 |

---

## 3. 4つのコアレイヤー (Architectural Layers)

```
+--------------------------------------------------------------------------+
|  4. Semantic Matching Layer (enishi.matcher)                             |
|     - Give & Want Asynchronous Pairing Engine                            |
|     - Category Bitmasks & Extensible LLM (Gemini Nano) Embeddings        |
+--------------------------------------------------------------------------+
                                    |
+--------------------------------------------------------------------------+
|  3. Ephemeral Communication Layer (enishi.transport / ephemeral_mail)   |
|     - Clova.Email-inspired Dynamic Prefix: enishi://node-01/eph-{token}   |
|     - One-Sender Lock: Locks to 1st peer, bounces eavesdroppers          |
|     - Auto Self-Destruct: In-memory secure wipe on completion            |
+--------------------------------------------------------------------------+
                                    |
+--------------------------------------------------------------------------+
|  2. Security & Governance Layer (enishi.security)                        |
|     - Web of Trust (enishi.wot): Anchor PageRank Sybil-resistant Score   |
|     - Zero-Knowledge Proofs (enishi.zkp): Anonymous Citizenship Verifier |
+--------------------------------------------------------------------------+
                                    |
+--------------------------------------------------------------------------+
|  1. Off-Grid Physical Layer (enishi.node & enishi.capsule)               |
|     - Binary Capsule: Ultra-compact <= 255 bytes (LoRa SF12/SF7 MTU)     |
|     - Fixed Waypoints (OffGridNode): Solar/battery powered edge stations |
+--------------------------------------------------------------------------+
```

### 1. Off-Grid Physical Layer (`enishi.capsule`, `enishi.node`)
- **超軽量バイナリカプセル構造**: LoRa無線の最大ペイロード（255バイトMTU）に収まるよう最適化。
  - Header (58B) + UTF-8 Give/Want (可変長) + HMAC-SHA256署名 (16B) = 平均 120〜200バイト。
  - カテゴリは2バイトの高速ビットマスク（農業、エネルギー、医療、修理、避難、教育、物流、水資材等）。
- **物理定点ノード (`OffGridNode`)**:
  - 太陽光パネル＋LiFePO4バッテリーで半永久稼働するエッジノード（Raspberry Pi Zero 2WやESP32）。

### 2. Security & Governance Layer (`enishi.wot`, `enishi.zkp`)
- **Web of Trust (`enishi.wot`)**:
  - 実在のコミュニティ拠点（北沢八幡の祠、直売所、消防団）をSeed Anchorとし、信頼度（Trust Score）を反復計算。
  - 悪意ある野良ノード（Rogue Sybil Node）からのパケット転送を自動遮断。
- **Zero-Knowledge Proofs (`enishi.zkp`)**:
  - 住民は初回登録時に暗号学的コミットメント $C = \text{Hash}(\text{community\_id} \parallel \text{secret} \parallel \text{salt})$ を発行。
  - パケット投入時に非対話型ゼロ知識証明（Fiat-Shamirヒューリスティック）を添付。
  - 受信ノードは「正規市民であること」を数学的に検証できるが、送信者の氏名、住所、公開鍵は一切漏洩しない。

### 3. Ephemeral Communication Layer (`enishi.ephemeral_mail`)
- **One-Sender使い捨て通信**:
  - カプセル照合後、一時的な使い捨てアドレス `enishi://{node_id}/eph-{prefix}` を生成。
  - **One-Senderロック**: 最初に接続してきたピアにチャネルを排他ロック。第三者の割り込みは即座に `OneSenderLockedViolation` で自動バウンス。
  - **自己破壊（Self-Destruct）**: メッセージ授受完了後、ノードのRAM領域をゼロパディングして痕跡を抹消。

### 4. Semantic Matching Layer (`enishi.matcher`)
- **双方向Give & Wantマッチャー**:
  - アリス（提供: 有機種子・太陽光診断、希望: 重力式浄水器）とボブ（提供: 浄水フィルター、希望: 太陽光診断）の双方向互恵性を算出。
  - オフライン辞書・同義語展開・カテゴリ親和度による高速マッチング（将来のGemini Nano統合フック完備）。

---

## 4. クイックスタート (Quickstart)

### 動作要件 (Requirements)
- Python 3.10 以上 (標準ライブラリのみで動作。外部依存ゼロ)
- オプション: `pytest` (テスト自動化)

### インストール (Installation)
```bash
git clone https://github.com/enishi-protocol/enishi-protocol.git
cd enishi-protocol
pip install -e .
```

### シミュレーション実行 (Run Example Simulation)
アリス（3日前投入）、ボブ（3日後マッチング）、攻撃者の排除（野良ノード遮断・ZKP未認証パケット拒絶・One-Sender割り込みバウンス）の実演スクリプト：

```bash
python3 examples/simulation.py
```

### 単体テスト実行 (Run Unit Tests)
```bash
PYTHONPATH=src:tests python3 -m unittest test_capsule test_security test_ephemeral_mail
# または pytest
pytest
```

---

## 5. コードサンプル (Code Example)

```python
from enishi.capsule import Capsule, CapsuleCategory
from enishi.node import OffGridNode
from enishi.wot import WebOfTrust
from enishi.zkp import ZeroKnowledgeProofSystem, CitizenshipCredential

# 1. Web of Trust と ZKP の初期化
wot = WebOfTrust(default_threshold=0.35)
wot.add_node("shrine-01", "pubkey_shrine", "北沢八幡の祠", is_seed_anchor=True)

zkp = ZeroKnowledgeProofSystem("jp-tokyo-local", b"anchor_hash")
alice_cred = CitizenshipCredential.issue("jp-tokyo-local", b"anchor_secret_key")
zkp.register_commitment(alice_cred.commitment_hash)

# 2. カプセル作成とバイナリシリアライズ (< 255 bytes)
capsule = Capsule(
    category_mask=CapsuleCategory.AGRICULTURE | CapsuleCategory.ENERGY,
    give_text="Heirloom Tomato Seeds & Solar Maintenance",
    want_text="Clean Water Filter Ceramic Candle",
    zkp_commitment=alice_cred.commitment_hash,
    node_id_hash=b"shrine01",
    rendezvous_token=b"r001",
)
raw_bytes = capsule.serialize()

# 3. ゼロ知識証明の生成とノード登録
proof = zkp.create_membership_proof(alice_cred, context_data=capsule.capsule_id + b"shrine01")
node = OffGridNode("shrine-01", b"node_secret", "jp-tokyo-local", wot, zkp)

admitted, reason = node.admit_capsule(raw_bytes, zkp_proof=proof)
print(f"Admitted: {admitted} -> {reason}")
```

---

## 6. ライセンス (License)
Apache License 2.0. 商用・非商用問わず自由に変更・再配布が可能です。
地域のオフグリッド防災インフラ、自律型コミュニティネットワーク、プライバシー重視のメッシュ通信プロジェクトでぜひご活用ください。
