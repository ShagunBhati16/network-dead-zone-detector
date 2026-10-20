# Threshold classification and remediation recommendations

## Wi-Fi thresholds

The default backend threshold now treats RSSI below **-70 dBm** as weak-signal evidence. The default poor/dead-zone boundary is **-80 dBm** (a dead-zone result still depends on connectivity/gateway failures or other configured rules). Values at or above -70 dBm are not marked weak by this specific threshold. Thresholds remain configurable through the detection function's threshold argument.

## Cellular

Cellular measurements use different radio metrics, normally RSRP (LTE/5G) rather than Wi-Fi RSSI. The floor-plan UI exposes a configurable example threshold (default -110 dBm RSRP) but clearly indicates that it cannot classify cellular coverage until actual cellular RSRP readings are collected. Do not enter Wi-Fi RSSI into the cellular field.

## Recommendation engine

The floor-plan panel can compare router repositioning, mesh node, repeater/extender and wired access point options, with budget and placement inputs. It highlights measured floor-plan points below the active Wi-Fi threshold. The dB improvement is a heuristic planning estimate only; it is not a propagation simulation or a guarantee. Validate any proposed change by taking new measurements at the same locations after installation.

## UI changes

This is an additive panel inside the existing floor-plan survey section. It does not replace the dashboard, map, navigation, or existing controls. The installer backs up files it replaces before applying the cumulative patch.
