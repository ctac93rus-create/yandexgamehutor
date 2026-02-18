# Monetization Notes

## Rewarded placement
- Точка rewarded добавлена сразу после завершения рейда в `RewardModal`: кнопка **«Удвоить (rewarded)»**.
- После `onRewarded` награда умножается x2 через `RewardCalculator`.
- После claim игрок возвращается в Merge, где награда применяется и автосохраняется.

## Economy hooks
- Базовая рейд-награда задаётся в `economy.json.raid`.
- Нехватка места под reward items в merge компенсируется через `OverflowPolicy` (dust).
